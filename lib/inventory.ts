import { InventoryTxnType, InventoryUnit, Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export function asQty(value: Prisma.Decimal | number | string): number {
  return Math.round(Number(value) * 1000) / 1000;
}

export function availableQty(onHand: Prisma.Decimal | number, reserved: Prisma.Decimal | number) {
  return asQty(asQty(onHand) - asQty(reserved));
}

export type MaterialNeed = {
  itemId: string;
  name: string;
  unit: InventoryUnit;
  required: number;
  onHand: number;
  reserved: number;
  available: number;
  short: number;
};

type Tx = Prisma.TransactionClient;

export async function orderMaterialNeeds(
  orderId: string,
  client: Tx | typeof prisma = prisma,
): Promise<MaterialNeed[]> {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { include: { bomLines: { include: { inventoryItem: true } } } },
        },
      },
    },
  });
  if (!order) return [];

  const byItem = new Map<
    string,
    { name: string; unit: InventoryUnit; required: number; onHand: number; reserved: number }
  >();

  for (const line of order.items) {
    for (const bom of line.product.bomLines) {
      const required = asQty(asQty(bom.qtyPerPair) * line.quantity);
      const current = byItem.get(bom.inventoryItemId);
      if (current) {
        current.required = asQty(current.required + required);
      } else {
        byItem.set(bom.inventoryItemId, {
          name: bom.inventoryItem.name,
          unit: bom.unit,
          required,
          onHand: asQty(bom.inventoryItem.qtyOnHand),
          reserved: asQty(bom.inventoryItem.qtyReserved),
        });
      }
    }
  }

  return [...byItem.entries()]
    .map(([itemId, row]) => {
      const available = availableQty(row.onHand, row.reserved);
      const short = asQty(Math.max(0, row.required - available));
      return { itemId, ...row, available, short };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function needsHaveShortage(needs: MaterialNeed[]) {
  return needs.some((need) => need.short > 0);
}

async function writeTxn(
  tx: Tx,
  input: {
    itemId: string;
    type: InventoryTxnType;
    qty: number;
    unit: InventoryUnit;
    orderId?: string | null;
    taskId?: string | null;
    reason?: string | null;
    createdById: string;
    qtyOnHand: number;
    qtyReserved: number;
  },
) {
  if (input.qtyOnHand < -0.0005 || input.qtyReserved < -0.0005) {
    throw new Error("Stock cannot go below zero.");
  }
  if (input.qtyReserved - input.qtyOnHand > 0.0005) {
    throw new Error("Reserved quantity cannot exceed on-hand stock.");
  }
  const txn = await tx.inventoryTransaction.create({
    data: {
      itemId: input.itemId,
      type: input.type,
      qty: new Prisma.Decimal(input.qty.toFixed(3)),
      unit: input.unit,
      orderId: input.orderId ?? null,
      taskId: input.taskId ?? null,
      reason: input.reason ?? null,
      createdById: input.createdById,
    },
  });
  await tx.inventoryItem.update({
    where: { id: input.itemId },
    data: {
      qtyOnHand: new Prisma.Decimal(input.qtyOnHand.toFixed(3)),
      qtyReserved: new Prisma.Decimal(input.qtyReserved.toFixed(3)),
    },
  });
  return txn;
}

export async function applyStockMove(
  tx: Tx,
  input: {
    itemId: string;
    type: InventoryTxnType;
    qty: number;
    orderId?: string | null;
    taskId?: string | null;
    reason?: string | null;
    createdById: string;
    countedOnHand?: number;
  },
): Promise<{ id: string } | null> {
  const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
  if (!item) throw new Error("Stock item was not found.");
  const qty = asQty(input.qty);
  if (input.type === "ADJUSTMENT") {
    if (qty === 0) throw new Error("Quantity must not be zero.");
  } else if (input.type !== "STOCK_COUNT" && qty <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  let onHand = asQty(item.qtyOnHand);
  let reserved = asQty(item.qtyReserved);
  let recordedQty = qty;

  switch (input.type) {
    case "PURCHASE":
    case "RETURN":
      onHand = asQty(onHand + qty);
      break;
    case "DAMAGE":
    case "WASTE":
      onHand = asQty(onHand - qty);
      break;
    case "ISSUE":
      if (qty - reserved > 0.0005) {
        throw new Error("Cannot issue more than is reserved for this work.");
      }
      onHand = asQty(onHand - qty);
      reserved = asQty(reserved - qty);
      break;
    case "ADJUSTMENT":
      onHand = asQty(onHand + qty);
      recordedQty = asQty(Math.abs(qty));
      if (recordedQty === 0) return null;
      break;
    case "STOCK_COUNT": {
      const counted = asQty(input.countedOnHand ?? qty);
      recordedQty = asQty(Math.abs(counted - onHand));
      onHand = counted;
      if (recordedQty === 0) return null;
      break;
    }
    case "RESERVE":
      reserved = asQty(reserved + qty);
      break;
    case "UNRESERVE":
      reserved = asQty(reserved - qty);
      break;
    default:
      throw new Error("Unknown stock movement.");
  }

  return writeTxn(tx, {
    itemId: item.id,
    type: input.type,
    qty: recordedQty,
    unit: item.unit,
    orderId: input.orderId,
    taskId: input.taskId,
    reason: input.reason,
    createdById: input.createdById,
    qtyOnHand: onHand,
    qtyReserved: reserved,
  });
}

export async function reservedQtyForOrder(orderId: string, itemId: string, client: Tx | typeof prisma = prisma) {
  const txns = await client.inventoryTransaction.findMany({
    where: { orderId, itemId, type: { in: ["RESERVE", "UNRESERVE", "ISSUE"] } },
  });
  let reserved = 0;
  for (const txn of txns) {
    const qty = asQty(txn.qty);
    if (txn.type === "RESERVE") reserved = asQty(reserved + qty);
    else reserved = asQty(reserved - qty);
  }
  return Math.max(0, reserved);
}

export async function releaseOrderReserves(orderId: string, actorId: string, client: Tx | typeof prisma = prisma) {
  const txns = await client.inventoryTransaction.findMany({
    where: { orderId, type: { in: ["RESERVE", "UNRESERVE", "ISSUE"] } },
  });
  const net = new Map<string, number>();
  for (const txn of txns) {
    const qty = asQty(txn.qty);
    const current = net.get(txn.itemId) ?? 0;
    if (txn.type === "RESERVE") net.set(txn.itemId, asQty(current + qty));
    else net.set(txn.itemId, asQty(current - qty));
  }
  for (const [itemId, qty] of net) {
    if (qty > 0.0005) {
      await applyStockMove(client as Tx, {
        itemId,
        type: "UNRESERVE",
        qty,
        orderId,
        reason: "Released from order",
        createdById: actorId,
      });
    }
  }
}

export async function reserveOrderMaterials(
  orderId: string,
  actorId: string,
  mode: "strict" | "available",
) {
  return prisma.$transaction(async (tx) => {
    await releaseOrderReserves(orderId, actorId, tx);
    const needs = await orderMaterialNeeds(orderId, tx);
    const short = needsHaveShortage(needs);
    if (mode === "strict" && short) {
      return { reserved: false, short: true, needs };
    }
    for (const need of needs) {
      const qty = mode === "strict" ? need.required : Math.min(need.required, need.available);
      if (qty > 0.0005) {
        await applyStockMove(tx, {
          itemId: need.itemId,
          type: "RESERVE",
          qty,
          orderId,
          reason: "Reserved on confirm",
          createdById: actorId,
        });
      }
    }
    return { reserved: true, short, needs };
  });
}

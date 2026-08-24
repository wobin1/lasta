"use server";

import { InventoryCategory, InventoryTxnType, InventoryUnit, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { applyStockMove } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function parseQty(raw: string): number | null {
  const n = Number(raw.replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

function revalidateStock(itemId?: string) {
  revalidatePath("/inventory");
  revalidatePath("/inventory/transactions");
  revalidatePath("/inventory/shortages");
  revalidatePath("/dashboard");
  if (itemId) revalidatePath(`/inventory/${itemId}`);
}

export async function createStockItem(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("inventory.write");
  const name = str(formData, "name");
  const unit = str(formData, "unit") as InventoryUnit;
  if (!name) return { error: "Name is required." };
  if (!Object.values(InventoryUnit).includes(unit)) return { error: "Choose a unit." };

  const minStock = parseQty(str(formData, "minStock") || "0") ?? 0;
  const reorderLevel = parseQty(str(formData, "reorderLevel") || "0") ?? 0;
  const opening = parseQty(str(formData, "openingQty") || "0") ?? 0;
  const costRaw = str(formData, "costNaira");
  let costKobo: number | null = null;
  if (costRaw) {
    const n = Number(costRaw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return { error: "Enter a valid cost in naira, or leave it blank." };
    costKobo = Math.round(n * 100);
  }

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.inventoryItem.create({
      data: {
        name,
        category: (str(formData, "category") as InventoryCategory) || "OTHER",
        color: str(formData, "color") || null,
        type: str(formData, "type") || null,
        unit,
        minStock,
        reorderLevel,
        costKobo,
        supplierName: str(formData, "supplierName") || null,
        notes: str(formData, "notes") || null,
      },
    });
    if (opening > 0) {
      await applyStockMove(tx, {
        itemId: created.id,
        type: "PURCHASE",
        qty: opening,
        reason: "Opening stock",
        createdById: user.id,
      });
    }
    return created;
  });

  await writeAudit({
    actorId: user.id,
    entity: "InventoryItem",
    entityId: item.id,
    action: "create",
    after: { name, unit },
  });
  revalidateStock(item.id);
  await flashSuccess("Stock item created");
  redirect(`/inventory/${item.id}`);
}

export async function updateStockItem(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("inventory.write");
  const name = str(formData, "name");
  if (!name) return { error: "Name is required." };
  const before = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!before) return { error: "Stock item was not found." };

  const minStock = parseQty(str(formData, "minStock") || "0") ?? 0;
  const reorderLevel = parseQty(str(formData, "reorderLevel") || "0") ?? 0;
  const costRaw = str(formData, "costNaira");
  let costKobo: number | null = null;
  if (costRaw) {
    const n = Number(costRaw.replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) return { error: "Enter a valid cost in naira, or leave it blank." };
    costKobo = Math.round(n * 100);
  }

  await prisma.inventoryItem.update({
    where: { id },
    data: {
      name,
      category: (str(formData, "category") as InventoryCategory) || before.category,
      color: str(formData, "color") || null,
      type: str(formData, "type") || null,
      minStock,
      reorderLevel,
      costKobo,
      supplierName: str(formData, "supplierName") || null,
      notes: str(formData, "notes") || null,
    },
  });
  await writeAudit({
    actorId: user.id,
    entity: "InventoryItem",
    entityId: id,
    action: "update",
    before: { name: before.name },
    after: { name },
  });
  revalidateStock(id);
  await flashSuccess("Stock item saved");
  return {};
}

export async function deleteStockItem(id: string, _formData: FormData) {
  const user = await requirePermission("inventory.write");
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: { _count: { select: { transactions: true, bomLines: true, purchaseLines: true } } },
  });
  if (!item) return;
  if (item._count.transactions + item._count.bomLines + item._count.purchaseLines > 0) return;

  await prisma.inventoryItem.delete({ where: { id } });
  await writeAudit({
    actorId: user.id,
    entity: "InventoryItem",
    entityId: id,
    action: "delete",
    before: { name: item.name },
  });
  revalidateStock();
  await flashSuccess("Stock item deleted");
  redirect("/inventory");
}

export async function recordStockMove(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("inventory.write");
  const type = str(formData, "type") as InventoryTxnType;
  const allowed: InventoryTxnType[] = ["PURCHASE", "RETURN", "ADJUSTMENT", "DAMAGE", "STOCK_COUNT"];
  if (!allowed.includes(type)) return { error: "Choose a stock movement the shop records by hand." };
  const qty = parseQty(str(formData, "qty"));
  if (qty === null || qty === 0) return { error: "Enter a quantity." };
  const direction = str(formData, "direction");
  const signed = type === "ADJUSTMENT" && direction === "remove" ? -Math.abs(qty) : Math.abs(qty);

  try {
    await prisma.$transaction(async (tx) => {
      await applyStockMove(tx, {
        itemId,
        type,
        qty: type === "STOCK_COUNT" ? Math.abs(qty) : signed,
        countedOnHand: type === "STOCK_COUNT" ? Math.abs(qty) : undefined,
        reason: str(formData, "reason") || null,
        createdById: user.id,
      });
    });
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }

  await writeAudit({
    actorId: user.id,
    entity: "InventoryTransaction",
    entityId: itemId,
    action: type.toLowerCase(),
    after: { type, qty: signed },
  });
  revalidateStock(itemId);
  await flashSuccess("Stock movement recorded");
  return {};
}

export async function saveBom(
  productId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("products.write");
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Product was not found." };

  let rows: { inventoryItemId: string; qtyPerPair: number }[] = [];
  try {
    rows = JSON.parse(str(formData, "lines") || "[]") as { inventoryItemId: string; qtyPerPair: number }[];
  } catch {
    return { error: "The bill of materials could not be read." };
  }

  const cleaned: { inventoryItemId: string; qtyPerPair: number }[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.inventoryItemId) continue;
    const qty = asFiniteQty(row.qtyPerPair);
    if (qty === null || qty <= 0) return { error: "Every BOM line needs a quantity per pair greater than zero." };
    if (seen.has(row.inventoryItemId)) return { error: "The same material is listed twice." };
    seen.add(row.inventoryItemId);
    cleaned.push({ inventoryItemId: row.inventoryItemId, qtyPerPair: qty });
  }

  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: cleaned.map((row) => row.inventoryItemId) } },
  });
  const itemMap = new Map(items.map((item) => [item.id, item]));

  await prisma.$transaction(async (tx) => {
    await tx.bomLine.deleteMany({ where: { productId } });
    for (const row of cleaned) {
      const item = itemMap.get(row.inventoryItemId);
      if (!item) throw new Error("A material on the BOM is missing.");
      await tx.bomLine.create({
        data: {
          productId,
          inventoryItemId: item.id,
          qtyPerPair: new Prisma.Decimal(row.qtyPerPair.toFixed(3)),
          unit: item.unit,
        },
      });
    }
  });

  await writeAudit({
    actorId: user.id,
    entity: "Product",
    entityId: productId,
    action: "bom",
    after: { lines: cleaned.length },
  });
  revalidatePath(`/products/${productId}`);
  revalidatePath("/inventory/shortages");
  await flashSuccess("Bill of materials saved");
  return {};
}

function asFiniteQty(value: number) {
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 1000) / 1000;
}

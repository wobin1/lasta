import { Prisma, ProductionStage, WasteReason } from "@prisma/client";
import { applyStockMove, asQty } from "./inventory";
import { WASTE_REASONS } from "./labels";
import { prisma } from "./prisma";

type Tx = Prisma.TransactionClient;

export class WasteError extends Error {}

export async function recordWaste(
  input: {
    itemId: string;
    qty: number;
    reason: WasteReason;
    orderId?: string | null;
    stage?: ProductionStage | null;
    taskId?: string | null;
    notes?: string | null;
    createdById: string;
  },
  client?: Tx,
) {
  const qty = asQty(input.qty);
  if (qty <= 0) throw new WasteError("Enter a waste quantity greater than zero.");
  if (!WASTE_REASONS.includes(input.reason)) throw new WasteError("Choose a waste reason.");

  const run = async (tx: Tx) => {
    const txn = await applyStockMove(tx, {
      itemId: input.itemId,
      type: "WASTE",
      qty,
      orderId: input.orderId,
      taskId: input.taskId,
      reason: input.notes ? `${input.reason}: ${input.notes}` : input.reason,
      createdById: input.createdById,
    });
    if (!txn) throw new WasteError("Waste was not recorded.");
    return tx.wasteRecord.create({
      data: {
        itemId: input.itemId,
        qty,
        reason: input.reason,
        orderId: input.orderId ?? null,
        stage: input.stage ?? null,
        taskId: input.taskId ?? null,
        transactionId: txn.id,
        notes: input.notes?.trim() || null,
        createdById: input.createdById,
      },
    });
  };

  if (client) return run(client);
  return prisma.$transaction((tx) => run(tx));
}

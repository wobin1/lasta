"use server";

import { ProductionStage, WasteReason } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requireSession } from "@/lib/session";
import { WASTE_REASONS } from "@/lib/labels";
import { recordWaste, WasteError } from "@/lib/waste";
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

function revalidateWaste(orderId?: string | null, itemId?: string | null) {
  revalidatePath("/qc/waste");
  revalidatePath("/inventory");
  revalidatePath("/inventory/transactions");
  revalidatePath("/dashboard");
  if (orderId) revalidatePath(`/orders/${orderId}`);
  if (itemId) revalidatePath(`/inventory/${itemId}`);
  revalidatePath("/production/me");
  revalidatePath("/production");
}

export async function logWaste(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireSession();
  if (!can(user.role, "waste.write")) {
    return { error: "You cannot log waste." };
  }

  const itemId = str(formData, "itemId");
  const taskId = str(formData, "taskId") || null;
  const orderId = str(formData, "orderId") || null;
  const stageRaw = str(formData, "stage");
  const reason = str(formData, "reason") as WasteReason;
  const qty = parseQty(str(formData, "qty"));
  if (!itemId) return { error: "Choose a material." };
  if (qty === null || qty <= 0) return { error: "Enter a quantity greater than zero." };
  if (!WASTE_REASONS.includes(reason)) return { error: "Choose a waste reason." };

  if (taskId) {
    const task = await prisma.productionTask.findUnique({
      where: { id: taskId },
      include: { job: { include: { orderItem: true } } },
    });
    if (!task) return { error: "That task was not found." };
    const isWorker = can(user.role, "production.work") && task.workerId === user.id;
    const isDesk = can(user.role, "inventory.write") || can(user.role, "qc.write") || can(user.role, "production.board");
    if (!isWorker && !isDesk) return { error: "You can only log waste on your own stage." };
  } else if (!can(user.role, "inventory.write") && !can(user.role, "qc.write")) {
    return { error: "Link waste to a production stage, or use stock movements." };
  }

  try {
    const row = await recordWaste({
      itemId,
      qty,
      reason,
      orderId,
      taskId,
      stage: (stageRaw as ProductionStage) || null,
      notes: str(formData, "notes") || null,
      createdById: user.id,
    });
    await writeAudit({
      actorId: user.id,
      entity: "WasteRecord",
      entityId: row.id,
      action: "create",
      after: { itemId, qty, reason },
    });
    revalidateWaste(orderId, itemId);
    await flashSuccess("Waste logged");
    return {};
  } catch (error) {
    if (error instanceof WasteError || error instanceof Error) return { error: error.message };
    throw error;
  }
}

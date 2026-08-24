"use server";

import { ProductionStage } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { flashSuccess } from "@/lib/flash";
import { prisma } from "@/lib/prisma";
import { QcError, submitQualityCheck } from "@/lib/qc";
import { QC_CHECKLISTS, checkpointForTask } from "@/lib/qc-checklists";
import { requirePermission } from "@/lib/session";
import type { FormState } from "./customers";

export type { FormState };

function revalidateQc(orderId?: string) {
  revalidatePath("/qc");
  revalidatePath("/qc/defects");
  revalidatePath("/qc/waste");
  revalidatePath("/production");
  revalidatePath("/production/me");
  revalidatePath("/finishing");
  revalidatePath("/dashboard");
  revalidatePath("/orders");
  if (orderId) revalidatePath(`/orders/${orderId}`);
}

export async function recordQualityCheck(
  taskId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requirePermission("qc.write");
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: {
      job: { include: { tasks: true, orderItem: true } },
    },
  });
  if (!task) return { error: "That task was not found." };
  const checkpoint = checkpointForTask(task.stage, task.job.tasks);
  if (!checkpoint) return { error: "This stage does not have a QC checklist." };

  const checklist: Record<string, "pass" | "fail"> = {};
  for (const item of QC_CHECKLISTS[checkpoint]) {
    const value = String(formData.get(`check-${item.key}`) ?? "").trim();
    if (value !== "pass" && value !== "fail") {
      return { error: `Mark ${item.label} as pass or fail.` };
    }
    checklist[item.key] = value;
  }

  const failed = Object.values(checklist).includes("fail");
  const reworkRaw = String(formData.get("reworkStage") ?? "").trim();
  const reworkStage = failed ? (reworkRaw as ProductionStage) : null;
  if (failed && !reworkRaw) return { error: "Choose which stage should be redone." };

  try {
    await submitQualityCheck({
      taskId,
      inspectorId: user.id,
      checklist,
      notes: String(formData.get("notes") ?? "").trim() || null,
      reworkStage,
    });
  } catch (error) {
    if (error instanceof QcError) return { error: error.message };
    throw error;
  }

  await writeAudit({
    actorId: user.id,
    entity: "QualityCheck",
    entityId: taskId,
    action: failed ? "fail" : "pass",
    after: { checkpoint, failed },
  });
  revalidateQc(task.job.orderItem.orderId);
  revalidatePath(`/qc/${taskId}`);
  await flashSuccess(failed ? "QC failed — rework created" : "QC passed");
  redirect("/qc");
}

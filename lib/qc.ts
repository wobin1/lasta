import { Prisma, ProductionStage, QcCheckpoint, QcResult } from "@prisma/client";
import { notifyCustomerStatus } from "./email";
import { notify, notifyRole } from "./notifications";
import { prisma } from "./prisma";
import { checkpointForTask, QC_CHECKLISTS, type ChecklistItem } from "./qc-checklists";
import { syncOrderFromTasks } from "./production";

type Tx = Prisma.TransactionClient;

export class QcError extends Error {}

export async function submitQualityCheck(input: {
  taskId: string;
  inspectorId: string;
  checklist: Record<string, "pass" | "fail">;
  notes?: string | null;
  reworkStage?: ProductionStage | null;
}) {
  let failed = false;
  let workerId: string | null = null;
  let notifyBody = "";
  let orderId = "";
  let publicId = "";
  let statusChanged: Awaited<ReturnType<typeof syncOrderFromTasks>> = null;

  await prisma.$transaction(async (tx) => {
    const task = await tx.productionTask.findUnique({
      where: { id: input.taskId },
      include: {
        job: {
          include: {
            tasks: { orderBy: { sortOrder: "asc" } },
            orderItem: { include: { order: true, product: true } },
          },
        },
      },
    });
    if (!task) throw new QcError("That task was not found.");
    if (task.status !== "AWAITING_QC") {
      throw new QcError("This stage is not waiting for QC.");
    }

    const checkpoint = checkpointForTask(task.stage, task.job.tasks);
    if (!checkpoint) throw new QcError("This stage does not have a QC checklist.");

    const items = QC_CHECKLISTS[checkpoint];
    const answers: Record<string, "pass" | "fail"> = {};
    const failedItems: ChecklistItem[] = [];
    for (const item of items) {
      const value = input.checklist[item.key];
      if (value !== "pass" && value !== "fail") {
        throw new QcError(`Mark ${item.label} as pass or fail.`);
      }
      answers[item.key] = value;
      if (value === "fail") failedItems.push(item);
    }

    const result: QcResult = failedItems.length > 0 ? "FAIL" : "PASS";
    if (result === "FAIL" && !input.reworkStage) {
      throw new QcError("Choose which stage should be redone.");
    }

    const check = await tx.qualityCheck.create({
      data: {
        orderItemId: task.job.orderItemId,
        checkpoint,
        result,
        checklist: answers,
        notes: input.notes?.trim() || null,
        inspectorId: input.inspectorId,
        productionTaskId: task.id,
      },
    });

    if (result === "FAIL") {
      for (const item of failedItems) {
        await tx.defect.create({
          data: {
            qualityCheckId: check.id,
            checkpoint,
            reason: item.label,
            workerId: task.workerId,
            notes: input.notes?.trim() || null,
          },
        });
      }
      await reopenForRework(tx, task, input.reworkStage!);
      failed = true;
      const reopened = task.job.tasks.find((row) => row.stage === input.reworkStage);
      if (reopened) {
        const fresh = await tx.productionTask.findUnique({ where: { id: reopened.id } });
        workerId = fresh?.workerId ?? null;
      } else {
        workerId = task.workerId;
      }
      notifyBody = `${task.job.orderItem.order.publicId} · ${task.job.orderItem.product.name} failed QC and needs rework.`;
    } else {
      await passQc(tx, task);
    }

    orderId = task.job.orderItem.orderId;
    publicId = task.job.orderItem.order.publicId;
    statusChanged = await syncOrderFromTasks(orderId, tx);
  });

  if (failed && workerId) {
    await notify({
      userId: workerId,
      body: notifyBody,
      href: "/production/me",
    });
  }
  if (statusChanged === "READY_FOR_DELIVERY") {
    await notifyRole("DELIVERY", `${publicId} is ready for delivery.`, "/delivery");
  }
  if (statusChanged) await notifyCustomerStatus(orderId, statusChanged);
}

async function passQc(
  tx: Tx,
  task: {
    id: string;
    sortOrder: number;
    job: { tasks: { id: string; stage: ProductionStage; sortOrder: number; status: string }[] };
  },
) {
  const now = new Date();
  await tx.productionTask.update({
    where: { id: task.id },
    data: { status: "COMPLETED", completedAt: now },
  });
  const next = task.job.tasks.find((row) => row.sortOrder === task.sortOrder + 1);
  if (next && next.status === "BLOCKED") {
    await tx.productionTask.update({
      where: { id: next.id },
      data: {
        status: next.stage === "QC" ? "AWAITING_QC" : "ASSIGNED",
        enteredAt: now,
        workerId: null,
      },
    });
  }
}

async function reopenForRework(
  tx: Tx,
  task: {
    id: string;
    job: {
      tasks: {
        id: string;
        stage: ProductionStage;
        sortOrder: number;
      }[];
    };
  },
  reworkStage: ProductionStage,
) {
  const current = task.job.tasks.find((row) => row.id === task.id);
  const target = task.job.tasks.find((row) => row.stage === reworkStage);
  if (!current || !target) throw new QcError("That rework stage is not on this job.");
  if (target.sortOrder > current.sortOrder) {
    throw new QcError("Rework has to be this stage or an earlier one.");
  }

  const now = new Date();
  for (const row of task.job.tasks) {
    if (row.sortOrder < target.sortOrder) continue;
    if (row.id === target.id) {
      await tx.productionTask.update({
        where: { id: row.id },
        data: {
          status: "ASSIGNED",
          startedAt: null,
          completedAt: null,
          enteredAt: now,
        },
      });
    } else {
      await tx.productionTask.update({
        where: { id: row.id },
        data: {
          status: "BLOCKED",
          startedAt: null,
          completedAt: null,
          workerId: null,
        },
      });
    }
  }
}

export async function latestCheckFor(
  orderItemId: string,
  checkpoint: QcCheckpoint,
  client: Tx | typeof prisma = prisma,
) {
  return client.qualityCheck.findFirst({
    where: { orderItemId, checkpoint },
    orderBy: { createdAt: "desc" },
  });
}

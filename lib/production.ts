import {
  OrderStatus,
  Prisma,
  ProductionStage,
  ProductionTaskStatus,
  QcCheckpoint,
} from "@prisma/client";
import { applyStockMove, asQty } from "./inventory";
import { notifyCustomerStatus } from "./email";
import { notify, notifyRole } from "./notifications";
import { prisma } from "./prisma";
import { jobHasQcStage, nextTaskStatus, shouldAwaitQc, stagesForCheckpoint } from "./qc-checklists";
import { productionStageLabel } from "./stages";

type Tx = Prisma.TransactionClient;

export class ProductionError extends Error {}

function stagesForProduct(input: {
  templateStages: { stage: ProductionStage; sortOrder: number }[];
  omitted: ProductionStage[];
}) {
  const skip = new Set(input.omitted);
  return input.templateStages
    .filter((row) => !skip.has(row.stage))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function workerHasTemplate(userId: string, templateId: string, client: Tx | typeof prisma = prisma) {
  const row = await client.workerTemplate.findUnique({
    where: { userId_templateId: { userId, templateId } },
  });
  return Boolean(row);
}

export type AssignWorkerOption = {
  id: string;
  name: string;
  allowed: boolean;
  reason?: string;
};

type ShopFloorWorker = {
  id: string;
  name: string;
  workerTemplates: { templateId: string }[];
};

/** Active shop-floor people (and anyone already linked to a template). */
export async function listShopFloorWorkers(): Promise<ShopFloorWorker[]> {
  return prisma.user.findMany({
    where: {
      active: true,
      OR: [
        { role: { in: ["PRODUCTION_WORKER", "FINISHING_WORKER"] } },
        { workerTemplates: { some: {} } },
      ],
    },
    include: { workerTemplates: { select: { templateId: true } } },
    orderBy: { name: "asc" },
  });
}

export function assignWorkerOptions(
  workers: ShopFloorWorker[],
  templateId: string,
  templateName: string,
): AssignWorkerOption[] {
  return workers.map((worker) => {
    const allowed = worker.workerTemplates.some((link) => link.templateId === templateId);
    return {
      id: worker.id,
      name: worker.name,
      allowed,
      reason: allowed ? undefined : `Does not have ${templateName}`,
    };
  });
}

export async function ensureProductionJobs(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          productionJob: true,
          product: {
            include: {
              productionTemplate: { include: { stages: { orderBy: { sortOrder: "asc" } } } },
              omittedStages: true,
            },
          },
        },
      },
    },
  });
  if (!order) return { created: 0, skipped: 0 };
  if (
    order.status === "DRAFT" ||
    order.status === "CANCELLED" ||
    order.status === "AWAITING_MATERIALS"
  ) {
    return { created: 0, skipped: 0 };
  }

  let created = 0;
  let skipped = 0;
  for (const item of order.items) {
    if (item.productionJob) continue;
    const template = item.product.productionTemplate;
    if (!template) {
      skipped += 1;
      continue;
    }
    const stages = stagesForProduct({
      templateStages: template.stages,
      omitted: item.product.omittedStages.map((row) => row.stage),
    });
    if (stages.length === 0) {
      skipped += 1;
      continue;
    }
    await prisma.productionJob.create({
      data: {
        orderItemId: item.id,
        templateId: template.id,
        templateName: template.name,
        tasks: {
          create: stages.map((row, index) => ({
            stage: row.stage,
            sortOrder: index,
            qty: item.quantity,
            status: index === 0 ? "ASSIGNED" : "BLOCKED",
            enteredAt: index === 0 ? new Date() : undefined,
          })),
        },
      },
    });
    created += 1;
  }
  return { created, skipped };
}

export async function syncOrderFromTasks(orderId: string, client: Tx | typeof prisma = prisma): Promise<OrderStatus | null> {
  const order = await client.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          qualityChecks: { orderBy: { createdAt: "desc" } },
          productionJob: { include: { tasks: true } },
        },
      },
    },
  });
  if (!order) return null;
  if (
    order.status === "DRAFT" ||
    order.status === "CANCELLED" ||
    order.status === "ON_HOLD" ||
    order.status === "READY_FOR_DELIVERY" ||
    order.status === "DISPATCHED" ||
    order.status === "DELIVERED" ||
    order.status === "COMPLETED"
  ) {
    return null;
  }

  const jobs = order.items.map((item) => item.productionJob).filter(Boolean);
  if (jobs.length === 0) return null;

  const tasks = jobs.flatMap((job) => job!.tasks);
  if (tasks.length === 0) return null;

  const reworkOpen = order.items.some((item) => {
    if (!item.productionJob) return false;
    const latest = latestByCheckpoint(item.qualityChecks);
    return [...latest.entries()].some(([checkpoint, check]) => {
      if (check.result !== "FAIL") return false;
      return item.productionJob!.tasks.some((task) => {
        const stages = stagesForCheckpoint(checkpoint, item.productionJob!.tasks);
        return stages.includes(task.stage) && (task.status === "ASSIGNED" || task.status === "STARTED");
      });
    });
  });

  const awaitingQc = tasks.some((task) => task.status === "AWAITING_QC");
  const open = tasks.filter((task) => task.status !== "COMPLETED");
  const allDone = open.length === 0;
  const finalPassed = order.items.every((item) => {
    if (!item.productionJob) return true;
    const latest = latestByCheckpoint(item.qualityChecks);
    return latest.get("FINAL")?.result === "PASS";
  });

  let next: OrderStatus = "READY_FOR_PRODUCTION";
  if (reworkOpen) {
    next = "REWORK_REQUIRED";
  } else if (awaitingQc || (allDone && !finalPassed)) {
    next = "QUALITY_CONTROL";
  } else if (allDone && finalPassed) {
    next = "READY_FOR_DELIVERY";
  } else {
    const earliest = open.reduce((min, task) => (task.sortOrder < min.sortOrder ? task : min));
    if (earliest.stage === "FINISHING") next = "FINISHING";
    else if (earliest.stage === "QC" || earliest.status === "AWAITING_QC") next = "QUALITY_CONTROL";
    else if (tasks.some((task) => task.status === "STARTED" || task.workerId)) next = "IN_PRODUCTION";
    else next = "READY_FOR_PRODUCTION";
  }

  if (next !== order.status) {
    await client.order.update({ where: { id: orderId }, data: { status: next } });
    return next;
  }
  return null;
}

function latestByCheckpoint(
  checks: { checkpoint: QcCheckpoint; result: "PASS" | "FAIL" }[],
) {
  const map = new Map<QcCheckpoint, { checkpoint: QcCheckpoint; result: "PASS" | "FAIL" }>();
  for (const check of checks) {
    if (!map.has(check.checkpoint)) map.set(check.checkpoint, check);
  }
  return map;
}

async function loadTask(taskId: string, client: Tx | typeof prisma = prisma) {
  const task = await client.productionTask.findUnique({
    where: { id: taskId },
    include: {
      worker: true,
      job: {
        include: {
          template: true,
          tasks: { orderBy: { sortOrder: "asc" } },
          orderItem: { include: { order: true, product: true } },
        },
      },
    },
  });
  if (!task) throw new ProductionError("That task was not found.");
  return task;
}

export async function assignProductionTask(taskId: string, workerId: string, actorId: string) {
  const task = await loadTask(taskId);
  if (task.status === "COMPLETED") throw new ProductionError("That stage is already finished.");
  if (task.status === "AWAITING_QC" || task.stage === "QC") {
    throw new ProductionError("Quality control inspects this stage. It is not assigned to a production worker.");
  }
  if (task.status === "BLOCKED") {
    throw new ProductionError("The previous stage is not finished yet.");
  }
  if (task.status === "STARTED") {
    throw new ProductionError("This stage is already in progress. Finish it before handing it to someone else.");
  }
  const allowed = await workerHasTemplate(workerId, task.job.templateId);
  if (!allowed) {
    throw new ProductionError("That worker does not have this production template.");
  }
  const worker = await prisma.user.findUnique({ where: { id: workerId } });
  if (!worker || !worker.active) throw new ProductionError("That worker cannot take work.");

  await prisma.productionTask.update({
    where: { id: taskId },
    data: { workerId, status: "ASSIGNED" },
  });
  await syncOrderFromTasks(task.job.orderItem.orderId);
  if (workerId !== actorId) {
    await notify({
      userId: workerId,
      body: `${task.job.orderItem.order.publicId} · ${task.job.orderItem.product.name} · ${productionStageLabel[task.stage]} was assigned to you.`,
      href: "/production/me",
    });
  }
}

export async function claimProductionTask(taskId: string, workerId: string) {
  const task = await loadTask(taskId);
  if (
    task.status === "COMPLETED" ||
    task.status === "BLOCKED" ||
    task.status === "AWAITING_QC" ||
    task.stage === "QC"
  ) {
    throw new ProductionError("This stage is not available to claim.");
  }
  if (task.workerId && task.workerId !== workerId) {
    throw new ProductionError("Someone else already has this stage.");
  }
  const allowed = await workerHasTemplate(workerId, task.job.templateId);
  if (!allowed) {
    throw new ProductionError("You are not on this production template.");
  }
  await prisma.productionTask.update({
    where: { id: taskId },
    data: { workerId, status: "ASSIGNED" },
  });
  await syncOrderFromTasks(task.job.orderItem.orderId);
}

export async function startProductionTask(taskId: string, workerId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const task = await loadTask(taskId, tx);
      if (task.status === "COMPLETED") throw new ProductionError("That stage is already finished.");
      if (task.status === "AWAITING_QC" || task.stage === "QC") {
        throw new ProductionError("This stage is with quality control.");
      }
      if (task.status === "BLOCKED") throw new ProductionError("The previous stage is not finished yet.");
      if (task.status === "STARTED") return;
      if (task.workerId && task.workerId !== workerId) {
        throw new ProductionError("This stage is assigned to someone else.");
      }
      const allowed = await workerHasTemplate(workerId, task.job.templateId, tx);
      if (!allowed) throw new ProductionError("You are not on this production template.");

      if (!task.workerId) {
        await tx.productionTask.update({
          where: { id: taskId },
          data: { workerId, status: "ASSIGNED" },
        });
      }

      if (task.sortOrder === 0) {
        try {
          await issueJobMaterials(task.jobId, taskId, workerId, tx);
        } catch (error) {
          if (error instanceof ProductionError) throw error;
          if (error instanceof Error) {
            throw new ProductionError(error.message);
          }
          throw error;
        }
      }

      await tx.productionTask.update({
        where: { id: taskId },
        data: { status: "STARTED", startedAt: new Date(), workerId },
      });
      await syncOrderFromTasks(task.job.orderItem.orderId, tx);
    });
  } catch (error) {
    throw unwrapProductionError(error);
  }
}

export async function completeProductionTask(taskId: string, workerId: string) {
  let awaitingQc = false;
  let inspectHref = "";
  let orderPublicId = "";
  let productName = "";
  let stageLabel = "";
  let orderId = "";
  let statusChanged: OrderStatus | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const task = await loadTask(taskId, tx);
      if (task.status === "COMPLETED" || task.status === "AWAITING_QC") return;
      if (task.stage === "QC") {
        throw new ProductionError("QC officers inspect this stage from the QC list.");
      }
      if (task.status !== "STARTED") {
        throw new ProductionError("Start the stage before you mark it complete.");
      }
      if (task.workerId !== workerId) {
        throw new ProductionError("Only the worker on this stage can complete it.");
      }

      const now = new Date();
      const next = task.job.tasks.find((row) => row.sortOrder === task.sortOrder + 1);
      const lastWithoutQc = !next && !jobHasQcStage(task.job.tasks);
      awaitingQc = shouldAwaitQc(task.stage, task.job.tasks) || lastWithoutQc;
      inspectHref = awaitingQc ? `/qc/${taskId}` : "";

      if (awaitingQc) {
        await tx.productionTask.update({
          where: { id: taskId },
          data: { status: "AWAITING_QC", completedAt: now },
        });
      } else {
        await tx.productionTask.update({
          where: { id: taskId },
          data: { status: "COMPLETED", completedAt: now },
        });
        if (next && next.status === "BLOCKED") {
          await tx.productionTask.update({
            where: { id: next.id },
            data: {
              status: nextTaskStatus(next.stage),
              enteredAt: now,
              workerId: null,
            },
          });
          if (next.stage === "QC") inspectHref = `/qc/${next.id}`;
        }
      }

      orderPublicId = task.job.orderItem.order.publicId;
      productName = task.job.orderItem.product.name;
      stageLabel = productionStageLabel[task.stage];
      orderId = task.job.orderItem.orderId;
      statusChanged = await syncOrderFromTasks(orderId, tx);
    });
  } catch (error) {
    throw unwrapProductionError(error);
  }

  if (inspectHref) {
    await notifyRole(
      "QC",
      `${orderPublicId} · ${productName} · ${stageLabel} is ready for QC.`,
      inspectHref,
    );
  }
  if (statusChanged === "READY_FOR_DELIVERY") {
    await notifyRole("DELIVERY", `${orderPublicId} is ready for delivery.`, "/delivery");
  }
  if (statusChanged) await notifyCustomerStatus(orderId, statusChanged);

  return { awaitingQc };
}

async function issueJobMaterials(jobId: string, taskId: string, actorId: string, tx: Tx) {
  const job = await tx.productionJob.findUnique({
    where: { id: jobId },
    include: {
      orderItem: {
        include: {
          product: { include: { bomLines: true } },
        },
      },
    },
  });
  if (!job) return;
  const already = await tx.inventoryTransaction.findFirst({
    where: { taskId, type: "ISSUE" },
  });
  if (already) return;

  for (const bom of job.orderItem.product.bomLines) {
    const qty = asQty(asQty(bom.qtyPerPair) * job.orderItem.quantity);
    if (qty <= 0) continue;
    const reserved = await reservedForOrderItem(
      job.orderItem.orderId,
      bom.inventoryItemId,
      tx,
    );
    const issueQty = Math.min(qty, reserved);
    if (issueQty <= 0) continue;
    await applyStockMove(tx, {
      itemId: bom.inventoryItemId,
      type: "ISSUE",
      qty: issueQty,
      orderId: job.orderItem.orderId,
      taskId,
      reason: "Issued at first production stage",
      createdById: actorId,
    });
  }
}

async function reservedForOrderItem(orderId: string, itemId: string, tx: Tx) {
  const txns = await tx.inventoryTransaction.findMany({
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

export async function holdOpenTasks(orderId: string, client: Tx | typeof prisma = prisma) {
  const jobs = await client.productionJob.findMany({
    where: { orderItem: { orderId } },
    include: { tasks: true },
  });
  for (const job of jobs) {
    for (const task of job.tasks) {
      if (task.status === "ASSIGNED" || task.status === "STARTED") {
        await client.productionTask.update({
          where: { id: task.id },
          data: { status: "BLOCKED" },
        });
      }
    }
  }
}

export function taskIsActionable(status: ProductionTaskStatus) {
  return status === "ASSIGNED" || status === "STARTED";
}

function unwrapProductionError(error: unknown): Error {
  let current: unknown = error;
  for (let i = 0; i < 5 && current; i++) {
    if (current instanceof ProductionError) return current;
    current = current instanceof Error ? current.cause : undefined;
  }
  if (error instanceof Error) {
    return new ProductionError(error.message);
  }
  return new ProductionError("Could not update that stage.");
}

import { ProductionKanban, type KanbanTask } from "@/components/ProductionKanban";
import { assignWorkerOptions, ensureProductionJobs, listShopFloorWorkers } from "@/lib/production";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function ProductionBoardPage() {
  const user = await requirePermission("production.board");
  const ready = await prisma.order.findMany({
    where: { status: { in: ["READY_FOR_PRODUCTION", "IN_PRODUCTION", "FINISHING", "QUALITY_CONTROL", "REWORK_REQUIRED"] } },
    select: { id: true },
  });
  for (const order of ready) {
    await ensureProductionJobs(order.id);
  }

  const shopFloor = await listShopFloorWorkers();
  const tasks = await prisma.productionTask.findMany({
    where: { status: { in: ["ASSIGNED", "STARTED", "AWAITING_QC"] } },
    include: {
      worker: true,
      job: {
        include: {
          orderItem: { include: { order: true, product: true } },
        },
      },
    },
    orderBy: [{ stage: "asc" }, { enteredAt: "asc" }],
  });

  const cards: KanbanTask[] = tasks.map((task) => ({
    id: task.id,
    stage: task.stage,
    status: task.status,
    qty: task.qty,
    enteredAt: task.enteredAt.toISOString(),
    workerId: task.workerId,
    workerName: task.worker?.name ?? null,
    templateId: task.job.templateId,
    templateName: task.job.templateName,
    orderId: task.job.orderItem.orderId,
    orderPublicId: task.job.orderItem.order.publicId,
    productName: task.job.orderItem.product.name,
    size: task.job.orderItem.size,
    requiredDate: task.job.orderItem.order.requiredDate.toISOString(),
    workers: assignWorkerOptions(shopFloor, task.job.templateId, task.job.templateName),
    inspectHref:
      can(user.role, "qc.write") && (task.status === "AWAITING_QC" || task.stage === "QC")
        ? `/qc/${task.id}`
        : null,
  }));

  return (
    <ProductionKanban
      tasks={cards}
      showFinishing={can(user.role, "finishing.queue")}
      showTemplates={can(user.role, "templates.write")}
      showQc={can(user.role, "qc.read")}
    />
  );
}

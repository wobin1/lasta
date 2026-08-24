import { EmptyState, PageHeader } from "@/components/ui/Field";
import { pageClass } from "@/components/ui/layout";
import { ProductionTaskCard, type TaskCardData } from "@/components/ProductionTaskCard";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

function toCard(task: {
  id: string;
  stage: TaskCardData["stage"];
  status: TaskCardData["status"];
  qty: number;
  enteredAt: Date;
  workerId: string | null;
  worker: { name: string } | null;
  job: {
    templateId: string;
    templateName: string;
    orderItem: {
      size: string;
      orderId: string;
      order: { publicId: string; requiredDate: Date };
      product: { name: string };
    };
  };
}): TaskCardData {
  return {
    id: task.id,
    stage: task.stage,
    status: task.status,
    qty: task.qty,
    enteredAt: task.enteredAt,
    workerId: task.workerId,
    workerName: task.worker?.name ?? null,
    templateId: task.job.templateId,
    templateName: task.job.templateName,
    orderId: task.job.orderItem.orderId,
    orderPublicId: task.job.orderItem.order.publicId,
    productName: task.job.orderItem.product.name,
    size: task.job.orderItem.size,
    requiredDate: task.job.orderItem.order.requiredDate,
  };
}

export default async function AvailableTasksPage() {
  const user = await requirePermission("production.work");
  const links = await prisma.workerTemplate.findMany({
    where: { userId: user.id },
    select: { templateId: true },
  });
  const templateIds = links.map((link) => link.templateId);

  const tasks =
    templateIds.length === 0
      ? []
      : await prisma.productionTask.findMany({
          where: {
            status: "ASSIGNED",
            workerId: null,
            stage: { not: "QC" },
            job: { templateId: { in: templateIds } },
          },
          include: {
            worker: true,
            job: { include: { orderItem: { include: { order: true, product: true } } } },
          },
          orderBy: { enteredAt: "asc" },
        });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Available work"
        description="Unassigned stages in templates you belong to. Claim one, then start it from My tasks."
        backHref="/production/me"
        backLabel="Back to my tasks"
      />
      {templateIds.length === 0 ? (
        <EmptyState
          title="No templates on your profile"
          body="Ask the owner or production manager to attach you to a production template."
        />
      ) : tasks.length === 0 ? (
        <EmptyState title="Nothing to claim" body="Open work in your templates already has a worker, or the previous stage is not done." />
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li key={task.id}>
              <ProductionTaskCard task={toCard(task)} showClaim />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

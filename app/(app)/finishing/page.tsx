import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { pageClass } from "@/components/ui/layout";
import { ProductionTaskCard, type TaskCardData } from "@/components/ProductionTaskCard";
import { assignWorkerOptions, listShopFloorWorkers } from "@/lib/production";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
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

export default async function FinishingPage() {
  const user = await requirePermission("finishing.queue");
  const tasks = await prisma.productionTask.findMany({
    where: { stage: "FINISHING", status: { in: ["ASSIGNED", "STARTED"] } },
    include: {
      worker: true,
      job: { include: { orderItem: { include: { order: true, product: true } } } },
    },
    orderBy: { enteredAt: "asc" },
  });

  const shopFloor = await listShopFloorWorkers();

  const mine = user.id;

  return (
    <div className={pageClass}>
      <PageHeader
        title="Finishing queue"
        description="Wait time starts when the previous stage is completed. Finishing is also a stage on My tasks."
        action={
          can(user.role, "production.board") ? (
            <ButtonLink href="/production" variant="ghost">
              Production board
            </ButtonLink>
          ) : (
            <ButtonLink href="/production/me" variant="ghost">
              My tasks
            </ButtonLink>
          )
        }
      />
      {tasks.length === 0 ? (
        <EmptyState title="Finishing is empty" body="Pairs reach this queue when lasting, filling, or sole work is done, depending on the template." />
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => {
            const mineAssigned = task.workerId === mine;
            return (
              <li key={task.id}>
                <ProductionTaskCard
                  task={toCard(task)}
                  workers={assignWorkerOptions(shopFloor, task.job.templateId, task.job.templateName)}
                  showAssign={can(user.role, "production.board")}
                  showClaim={!task.workerId && can(user.role, "production.work")}
                  showStart={mineAssigned && task.status === "ASSIGNED"}
                  showComplete={mineAssigned && task.status === "STARTED"}
                  showWait
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

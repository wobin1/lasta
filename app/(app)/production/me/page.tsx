import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { tableLinkClass } from "@/components/ui/Table";
import { Surface, pageClass } from "@/components/ui/layout";
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
      product: {
        name: string;
        bomLines?: { inventoryItemId: string; inventoryItem: { name: string } }[];
      };
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
    materials: task.job.orderItem.product.bomLines?.map((line) => ({
      id: line.inventoryItemId,
      name: line.inventoryItem.name,
    })),
  };
}

export default async function MyTasksPage() {
  const user = await requirePermission("production.work");
  const tasks = await prisma.productionTask.findMany({
    where: { workerId: user.id, status: { in: ["ASSIGNED", "STARTED"] }, stage: { not: "QC" } },
    include: {
      worker: true,
      job: {
        include: {
          orderItem: {
            include: {
              order: true,
              product: { include: { bomLines: { include: { inventoryItem: true } } } },
            },
          },
        },
      },
    },
    orderBy: [{ status: "desc" }, { enteredAt: "asc" }],
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="My tasks"
        description="Work assigned to you across every template you belong to. Start and complete here — no station list."
      />
      <Surface>
        <p className="font-semibold tracking-tight">Need more work?</p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Claim an unassigned stage from the templates you belong to.
        </p>
        <p className="mt-4">
          <Link href="/production/available" className={tableLinkClass}>
            Available work in your templates
          </Link>
        </p>
      </Surface>
      {tasks.length === 0 ? (
        <EmptyState
          title="Nothing assigned to you"
          body="Claim a job from available work, or wait for the production manager to assign you."
        />
      ) : (
        <ul className="space-y-4">
          {tasks.map((task) => (
            <li key={task.id}>
              <ProductionTaskCard
                task={toCard(task)}
                showStart={task.status === "ASSIGNED"}
                showComplete={task.status === "STARTED"}
                showWait={task.stage === "FINISHING"}
                showWaste={task.status === "STARTED"}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { QcForm } from "@/components/QcForm";
import { WasteForm } from "@/components/WasteForm";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { formatWait } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { checkpointForTask, qcCheckpointLabel } from "@/lib/qc-checklists";
import { requirePermission } from "@/lib/session";
import { productionStageBar, productionStageLabel } from "@/lib/stages";

export default async function QcInspectPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  await requirePermission("qc.write");
  const { taskId } = await params;
  const task = await prisma.productionTask.findUnique({
    where: { id: taskId },
    include: {
      worker: true,
      job: {
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          orderItem: {
            include: {
              order: true,
              product: { include: { bomLines: { include: { inventoryItem: true } } } },
            },
          },
        },
      },
    },
  });
  if (!task) notFound();
  if (task.status !== "AWAITING_QC") {
    return (
      <div className="mx-auto max-w-3xl space-y-10">
        <PageHeader
          title="Not waiting for QC"
          description="This stage is not on the QC list right now."
          backHref="/qc"
          backLabel="Back to QC"
        />
        <EmptyState
          title="Nothing to inspect"
          body="This pair has already been passed, failed, or moved back to the floor."
        />
      </div>
    );
  }

  const checkpoint = checkpointForTask(task.stage, task.job.tasks);
  const title = checkpoint ? qcCheckpointLabel[checkpoint] : productionStageLabel[task.stage];
  const materials = task.job.orderItem.product.bomLines.map((line) => ({
    id: line.inventoryItemId,
    name: line.inventoryItem.name,
  }));
  const waitedFrom = task.completedAt ?? task.enteredAt;
  const metrics = [
    { label: "Size", value: task.job.orderItem.size },
    { label: "Quantity", value: `${task.qty} pair${task.qty === 1 ? "" : "s"}` },
    { label: "Worker", value: task.worker?.name ?? "Unassigned" },
    { label: "Waiting", value: formatWait(waitedFrom) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <Link
        href="/qc"
        className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
      >
        ← Back to QC
      </Link>

      <article className="overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]">
        <div className="flex gap-4 p-6 sm:gap-5 sm:p-7">
          <span
            className={`mt-1 h-16 w-1.5 shrink-0 rounded-full ${productionStageBar[task.stage]}`}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {task.job.orderItem.order.publicId}
            </h1>
            <p className="mt-1 text-[var(--muted)]">
              {task.job.orderItem.product.name}
              <span className="text-[var(--line)]"> · </span>
              {task.job.templateName}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {metrics.map((metric) => (
                <li key={metric.label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                    {metric.label}
                  </p>
                  <p className="mt-1 font-semibold tracking-tight">{metric.value}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link
                className="text-sm font-medium underline-offset-2 hover:underline"
                href={`/orders/${task.job.orderItem.orderId}`}
              >
                Open order
              </Link>
            </p>
          </div>
        </div>
      </article>

      <section className="rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]">
        <QcForm
          taskId={task.id}
          stage={task.stage}
          stages={task.job.tasks.map((row) => ({ stage: row.stage, sortOrder: row.sortOrder }))}
        />
      </section>

      <details className="group rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)] open:pb-1">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 text-left marker:content-none [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block font-semibold tracking-tight">Log waste</span>
            <span className="mt-0.5 block text-sm text-[var(--muted)]">
              Optional. Use if this inspection scrapped material.
            </span>
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ground)] text-[var(--muted)] group-open:rotate-180">
            <ChevronGlyph />
          </span>
        </summary>
        <div className="border-t border-[var(--line)] px-6 py-5">
          <WasteForm
            items={materials}
            taskId={task.id}
            orderId={task.job.orderItem.orderId}
            stage={task.stage}
          />
        </div>
      </details>
    </div>
  );
}

function ChevronGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

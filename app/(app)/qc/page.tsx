import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { cardClassLg, pageClass } from "@/components/ui/layout";
import { QcNav } from "@/components/QcNav";
import { formatWait } from "@/lib/dates";
import { checkpointForTask, qcCheckpointLabel } from "@/lib/qc-checklists";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { productionStageBar, productionStageLabel } from "@/lib/stages";
import { can } from "@/lib/permissions";

export default async function QcQueuePage() {
  const user = await requirePermission("qc.read");
  const tasks = await prisma.productionTask.findMany({
    where: { status: "AWAITING_QC" },
    include: {
      worker: true,
      job: {
        include: {
          tasks: { orderBy: { sortOrder: "asc" } },
          orderItem: { include: { order: true, product: true } },
        },
      },
    },
    orderBy: { completedAt: "asc" },
  });

  const canInspect = can(user.role, "qc.write");

  return (
    <div className={pageClass}>
      <PageHeader
        title="Quality control"
        description="Pairs wait here after cutting, stitching, lasting, or finishing. Fail sends the pair back for rework."
      />
      <QcNav current="queue" />
      {tasks.length === 0 ? (
        <EmptyState
          title="Nothing waiting for QC"
          body="Work reaches this list when a worker completes a stage that needs inspection."
        />
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => {
            const checkpoint = checkpointForTask(task.stage, task.job.tasks);
            const waitedFrom = task.completedAt ?? task.enteredAt;
            return (
              <li key={task.id}>
                <article className={`flex h-full flex-col ${cardClassLg}`}>
                  <div className="flex gap-3">
                    <span
                      className={`mt-1 h-10 w-1 shrink-0 rounded-full ${productionStageBar[task.stage]}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--muted)]">
                        {checkpoint ? qcCheckpointLabel[checkpoint] : productionStageLabel[task.stage]}
                      </p>
                      <h2 className="mt-0.5 text-xl font-semibold tracking-tight">
                        <Link
                          className="underline-offset-2 hover:underline"
                          href={`/orders/${task.job.orderItem.orderId}`}
                        >
                          {task.job.orderItem.order.publicId}
                        </Link>
                      </h2>
                      <p className="mt-1 text-[var(--muted)]">
                        {task.job.orderItem.product.name} · size {task.job.orderItem.size}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt className="text-[var(--muted)]">Qty</dt>
                      <dd className="mt-0.5 font-medium">
                        {task.qty} pair{task.qty === 1 ? "" : "s"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Worker</dt>
                      <dd className="mt-0.5 font-medium">{task.worker?.name ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Waiting</dt>
                      <dd className="mt-0.5 font-medium">{formatWait(waitedFrom)}</dd>
                    </div>
                  </dl>
                  <div className="mt-auto pt-5">
                    {canInspect ? (
                      <Link
                        className="inline-flex min-h-11 items-center rounded-2xl bg-[var(--text)] px-4 text-sm font-medium text-white hover:bg-[var(--text-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
                        href={`/qc/${task.id}`}
                      >
                        Inspect
                      </Link>
                    ) : (
                      <p className="text-sm text-[var(--muted)]">Owner, manager, or QC can pass or fail this.</p>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

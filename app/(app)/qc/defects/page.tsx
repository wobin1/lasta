import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { QcNav } from "@/components/QcNav";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { qcCheckpointLabel } from "@/lib/qc-checklists";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  await requirePermission("qc.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const where: Prisma.DefectWhereInput = q
    ? {
        OR: [
          { reason: containsInsensitive(q) },
          { notes: containsInsensitive(q) },
          { worker: { name: containsInsensitive(q) } },
          { qualityCheck: { orderItem: { order: { publicId: containsInsensitive(q) } } } },
          { qualityCheck: { orderItem: { product: { name: containsInsensitive(q) } } } },
        ],
      }
    : {};
  const [totalAll, matching] = await Promise.all([
    prisma.defect.count(),
    prisma.defect.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const defects = await prisma.defect.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      worker: true,
      qualityCheck: {
        include: {
          inspector: true,
          orderItem: { include: { order: true, product: true } },
        },
      },
    },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, size: sizeParam(size) };

  return (
    <div className={pageClass}>
      <PageHeader
        title="Defects"
        description="Every failed QC point. A lasting fail should show here with the rework it created."
        backHref="/qc"
        backLabel="Back to QC"
      />
      <QcNav current="defects" />
      {totalAll === 0 ? (
        <EmptyState title="No defects yet" body="Failed checklist points appear here after an inspector records a fail." />
      ) : (
        <TableCard
          title="Defect log"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/qc/defects"
              q={q}
              qPlaceholder="Order, product, or reason"
              extras={{ size: sizeParam(size) }}
            />
          }
          footer={<Pagination path="/qc/defects" params={query} window={window} />}
        >
            {defects.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No defects match that search.</p>
            ) : (
              <table className={tableClass}>
                <caption className="sr-only">Defects by QC check</caption>
                <thead>
                  <tr>
                    <th className={thClass}>When</th>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Checkpoint</th>
                    <th className={thClass}>Defect</th>
                    <th className={thClass}>Worker</th>
                    <th className={thClass}>Inspector</th>
                  </tr>
                </thead>
                <tbody>
                  {defects.map((defect) => (
                    <tr key={defect.id} className={trClass}>
                      <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                        {formatLagosDateTime(defect.createdAt)}
                      </td>
                      <td className={tdClass}>
                        <Link href={`/orders/${defect.qualityCheck.orderItem.orderId}`} className={tableLinkClass}>
                          {defect.qualityCheck.orderItem.order.publicId}
                        </Link>
                        <span className="mt-0.5 block text-sm text-[var(--muted)]">
                          {defect.qualityCheck.orderItem.product.name}
                        </span>
                      </td>
                      <td className={tdClass}>{qcCheckpointLabel[defect.checkpoint]}</td>
                      <td className={tdClass}>
                        {defect.reason}
                        {defect.notes ? (
                          <span className="mt-0.5 block text-sm text-[var(--muted)]">{defect.notes}</span>
                        ) : null}
                      </td>
                      <td className={`${tdClass} text-[var(--muted)]`}>{defect.worker?.name ?? "—"}</td>
                      <td className={`${tdClass} text-[var(--muted)]`}>{defect.qualityCheck.inspector.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </TableCard>
      )}
    </div>
  );
}

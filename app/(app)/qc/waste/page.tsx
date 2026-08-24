import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { QcNav } from "@/components/QcNav";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { formatQty, wasteReasonLabel } from "@/lib/labels";
import { asQty } from "@/lib/inventory";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { productionStageLabel } from "@/lib/stages";

export default async function WasteReportPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  await requirePermission("qc.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const where: Prisma.WasteRecordWhereInput = q
    ? {
        OR: [
          { item: { name: containsInsensitive(q) } },
          { order: { publicId: containsInsensitive(q) } },
          { createdBy: { name: containsInsensitive(q) } },
        ],
      }
    : {};
  const [totalAll, matching] = await Promise.all([
    prisma.wasteRecord.count(),
    prisma.wasteRecord.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const rows = await prisma.wasteRecord.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { item: true, order: true, createdBy: true },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, size: sizeParam(size) };

  return (
    <div className={pageClass}>
      <PageHeader
        title="Waste"
        description="Material written off at issue or when a stage finished. Each row is also a stock WASTE movement."
        backHref="/qc"
        backLabel="Back to QC"
      />
      <QcNav current="waste" />
      {totalAll === 0 ? (
        <EmptyState
          title="No waste logged"
          body="Workers can log waste on a started stage. QC can log it on an inspection."
        />
      ) : (
        <TableCard
          title="Waste log"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/qc/waste"
              q={q}
              qPlaceholder="Material, order, or person"
              extras={{ size: sizeParam(size) }}
            />
          }
          footer={<Pagination path="/qc/waste" params={query} window={window} />}
        >
            {rows.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No waste rows match that search.</p>
            ) : (
              <table className={tableClass}>
                <caption className="sr-only">Waste records</caption>
                <thead>
                  <tr>
                    <th className={thClass}>When</th>
                    <th className={thClass}>Material</th>
                    <th className={`${thClass} text-right`}>Qty</th>
                    <th className={thClass}>Reason</th>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={trClass}>
                      <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                        {formatLagosDateTime(row.createdAt)}
                      </td>
                      <td className={tdClass}>{row.item.name}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>
                        {formatQty(asQty(row.qty), row.item.unit)}
                      </td>
                      <td className={tdClass}>
                        {wasteReasonLabel[row.reason]}
                        {row.stage ? (
                          <span className="mt-0.5 block text-sm text-[var(--muted)]">
                            {productionStageLabel[row.stage]}
                          </span>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        {row.order ? (
                          <Link href={`/orders/${row.order.id}`} className={tableLinkClass}>
                            {row.order.publicId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${tdClass} text-[var(--muted)]`}>{row.createdBy.name}</td>
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

import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { purchaseStatusLabel, purchaseStatusTone } from "@/lib/labels";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  const user = await requirePermission("inventory.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const where: Prisma.PurchaseRequestWhereInput = q
    ? {
        OR: [{ publicId: containsInsensitive(q) }, { createdBy: { name: containsInsensitive(q) } }],
      }
    : {};
  const [totalAll, matching] = await Promise.all([
    prisma.purchaseRequest.count(),
    prisma.purchaseRequest.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const requests = await prisma.purchaseRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { createdBy: true, _count: { select: { lines: true } } },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, size: sizeParam(size) };

  return (
    <div className={pageClass}>
      <PageHeader
        title="Purchase requests"
        description="Ask for stock, approve it, then receive it to raise on-hand."
        backHref="/inventory"
        backLabel="Back to stock"
        action={
          can(user.role, "purchases.write") ? (
            <ButtonLink href="/inventory/purchases/new">New request</ButtonLink>
          ) : null
        }
      />
      {totalAll === 0 ? (
        <EmptyState
          title="No purchase requests"
          body="Create one from shortages or from here when a bin is low."
          action={
            can(user.role, "purchases.write") ? (
              <ButtonLink href="/inventory/purchases/new">New request</ButtonLink>
            ) : null
          }
        />
      ) : (
        <TableCard
          title="Requests"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/inventory/purchases"
              q={q}
              qPlaceholder="Request ID or person"
              extras={{ size: sizeParam(size) }}
            />
          }
          footer={<Pagination path="/inventory/purchases" params={query} window={window} />}
        >
            {requests.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No requests match that search.</p>
            ) : (
              <table className={tableClass}>
                <caption className="sr-only">Purchase requests</caption>
                <thead>
                  <tr>
                    <th className={thClass}>Request</th>
                    <th className={thClass}>Status</th>
                    <th className={`${thClass} text-right`}>Lines</th>
                    <th className={thClass}>By</th>
                    <th className={thClass}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className={trClass}>
                      <td className={tdClass}>
                        <Link href={`/inventory/purchases/${request.id}`} className={tableLinkClass}>
                          {request.publicId}
                        </Link>
                      </td>
                      <td className={tdClass}>
                        <Chip label={purchaseStatusLabel[request.status]} tone={purchaseStatusTone[request.status]} />
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>{request._count.lines}</td>
                      <td className={`${tdClass} text-[var(--muted)]`}>{request.createdBy.name}</td>
                      <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                        {formatLagosDateTime(request.createdAt)}
                      </td>
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

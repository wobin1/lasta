import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { asQty } from "@/lib/inventory";
import { formatQty, inventoryTxnLabel } from "@/lib/labels";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function InventoryTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  await requirePermission("inventory.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const where: Prisma.InventoryTransactionWhereInput = q
    ? {
        OR: [
          { item: { name: containsInsensitive(q) } },
          { order: { publicId: containsInsensitive(q) } },
          { createdBy: { name: containsInsensitive(q) } },
        ],
      }
    : {};
  const [totalAll, matching] = await Promise.all([
    prisma.inventoryTransaction.count(),
    prisma.inventoryTransaction.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const txns = await prisma.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { item: true, createdBy: true, order: true },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, size: sizeParam(size) };

  return (
    <div className={pageClass}>
      <PageHeader
        title="Stock ledger"
        description="Every on-hand or reserved change is a row here."
        backHref="/inventory"
        backLabel="Back to stock"
      />
      {totalAll === 0 ? (
        <EmptyState title="No movements yet" body="Purchases, issues, and adjustments appear here." />
      ) : (
        <TableCard
          title="Movements"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/inventory/transactions"
              q={q}
              qPlaceholder="Item, order, or person"
              extras={{ size: sizeParam(size) }}
            />
          }
          footer={<Pagination path="/inventory/transactions" params={query} window={window} />}
        >
            {txns.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No movements match that search.</p>
            ) : (
              <table className={tableClass}>
                <caption className="sr-only">Inventory transactions</caption>
                <thead>
                  <tr>
                    <th className={thClass}>When</th>
                    <th className={thClass}>Item</th>
                    <th className={thClass}>Type</th>
                    <th className={`${thClass} text-right`}>Qty</th>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>By</th>
                  </tr>
                </thead>
                <tbody>
                  {txns.map((txn) => (
                    <tr key={txn.id} className={trClass}>
                      <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                        {formatLagosDateTime(txn.createdAt)}
                      </td>
                      <td className={tdClass}>
                        <Link href={`/inventory/${txn.itemId}`} className={tableLinkClass}>
                          {txn.item.name}
                        </Link>
                      </td>
                      <td className={tdClass}>{inventoryTxnLabel[txn.type]}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatQty(asQty(txn.qty), txn.unit)}</td>
                      <td className={tdClass}>
                        {txn.order ? (
                          <Link href={`/orders/${txn.order.id}`} className={tableLinkClass}>
                            {txn.order.publicId}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`${tdClass} text-[var(--muted)]`}>{txn.createdBy.name}</td>
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

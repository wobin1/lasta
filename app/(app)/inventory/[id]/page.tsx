import { notFound } from "next/navigation";
import { deleteStockItem } from "@/app/actions/inventory";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { StockItemForm } from "@/components/StockItemForm";
import { StockMoveForm } from "@/components/StockMoveForm";
import { WasteForm } from "@/components/WasteForm";
import { ActionSheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { SummaryStat } from "@/components/ui/Stat";
import { tableClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { asQty, availableQty } from "@/lib/inventory";
import { formatQty, inventoryCategoryLabel, inventoryTxnLabel } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function StockItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("inventory.read");
  const { id } = await params;
  const item = await prisma.inventoryItem.findUnique({
    where: { id },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 12, include: { createdBy: true, order: true } },
      _count: { select: { transactions: true, bomLines: true, purchaseLines: true } },
    },
  });
  if (!item) notFound();

  const onHand = asQty(item.qtyOnHand);
  const reserved = asQty(item.qtyReserved);
  const available = availableQty(onHand, reserved);
  const inUse = item._count.transactions + item._count.bomLines + item._count.purchaseLines > 0;
  const low = available <= asQty(item.reorderLevel) || available <= asQty(item.minStock);

  return (
    <div className={pageClass}>
      <PageHeader
        title={item.name}
        description={item.color ? item.color : undefined}
        backHref="/inventory"
        backLabel="Back to stock"
        action={
          <div className="flex flex-wrap gap-2">
            {can(user.role, "inventory.write") ? (
              <ActionSheet triggerLabel="Record movement" title="Record a movement" variant="primary" size="compact">
                <p className="mb-4 text-sm text-[var(--muted)]">
                  On-hand only changes through a movement. Use receive, issue, or adjust.
                </p>
                <StockMoveForm itemId={item.id} />
              </ActionSheet>
            ) : null}
            {can(user.role, "waste.write") ? (
              <ActionSheet triggerLabel="Log waste" title="Log waste" size="compact">
                <p className="mb-4 text-sm text-[var(--muted)]">
                  Use this when material is scrapped. It writes a WASTE stock movement.
                </p>
                <WasteForm items={[{ id: item.id, name: item.name }]} />
              </ActionSheet>
            ) : null}
            {can(user.role, "inventory.write") ? (
              <ActionSheet triggerLabel="Edit item" title="Edit item" size="compact">
                <p className="mb-4 text-sm text-[var(--muted)]">Reorder and min stock drive the low-stock list.</p>
                <StockItemForm
                  item={{
                    id: item.id,
                    name: item.name,
                    category: item.category,
                    color: item.color,
                    type: item.type,
                    unit: item.unit,
                    minStock: asQty(item.minStock),
                    reorderLevel: asQty(item.reorderLevel),
                    costKobo: item.costKobo,
                    supplierName: item.supplierName,
                    notes: item.notes,
                  }}
                />
              </ActionSheet>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Chip label={inventoryCategoryLabel[item.category]} />
        {low ? <Chip label="Low" tone="warning" /> : null}
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        <SummaryStat label="On hand" value={formatQty(onHand, item.unit)} hint="Physical stock" />
        <SummaryStat label="Reserved" value={formatQty(reserved, item.unit)} hint="Held for open orders" />
        <SummaryStat
          label="Available"
          value={formatQty(available, item.unit)}
          hint={low ? "At or below reorder" : "Can still be promised"}
          tone={low ? "warning" : "neutral"}
        />
      </ul>

      {can(user.role, "inventory.write") && item.costKobo != null ? (
        <p className="text-sm text-[var(--muted)]">Cost {formatNgnFromKobo(item.costKobo)} per unit.</p>
      ) : null}

      {item.transactions.length === 0 ? (
        <EmptyState title="No movements yet" body="Purchases, issues, and adjustments for this item appear here." />
      ) : (
        <CollapsibleSection
          title="Recent movements"
          summary={`${item.transactions.length} row${item.transactions.length === 1 ? "" : "s"}`}
        >
          <div className="overflow-x-auto">
          <table className={tableClass}>
            <caption className="sr-only">Recent inventory movements</caption>
            <thead>
              <tr>
                <th className={`${thClass} pl-0`}>When</th>
                <th className={thClass}>Type</th>
                <th className={`${thClass} text-right`}>Qty</th>
                <th className={`${thClass} pr-0`}>By</th>
              </tr>
            </thead>
            <tbody>
              {item.transactions.map((txn) => (
                <tr key={txn.id} className={trClass}>
                  <td className={`${tdClass} pl-0 tabular-nums text-[var(--muted)]`}>
                    {formatLagosDateTime(txn.createdAt)}
                  </td>
                  <td className={tdClass}>
                    {inventoryTxnLabel[txn.type]}
                    {txn.order ? (
                      <span className="mt-0.5 block text-sm text-[var(--muted)]">{txn.order.publicId}</span>
                    ) : null}
                    {txn.reason ? (
                      <span className="mt-0.5 block text-sm text-[var(--muted)]">{txn.reason}</span>
                    ) : null}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatQty(asQty(txn.qty), txn.unit)}</td>
                  <td className={`${tdClass} pr-0 text-[var(--muted)]`}>{txn.createdBy.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CollapsibleSection>
      )}

      {can(user.role, "inventory.write") ? (
        inUse ? (
          <p className="max-w-xl text-sm text-[var(--muted)]">
            This item is on a BOM, purchase, or movement, so it cannot be deleted.
          </p>
        ) : (
          <ConfirmDelete
            action={deleteStockItem.bind(null, item.id)}
            label="Delete stock item"
            message={`Delete ${item.name}? This cannot be undone.`}
          />
        )
      ) : null}
    </div>
  );
}

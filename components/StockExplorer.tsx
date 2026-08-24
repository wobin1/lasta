import Link from "next/link";
import type { InventoryCategory, InventoryUnit } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Chip } from "@/components/ui/Chip";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { formatQty, inventoryCategoryLabel } from "@/lib/labels";
import type { PageWindow } from "@/lib/pagination";
import { sizeParam } from "@/lib/pagination";

export type StockListRow = {
  id: string;
  name: string;
  color: string | null;
  category: InventoryCategory;
  unit: InventoryUnit;
  onHand: number;
  reserved: number;
  available: number;
  reorderLevel: number;
  minStock: number;
  low: boolean;
};

export function StockExplorer({
  items,
  q,
  view,
  window,
  allCount,
  lowCount,
}: {
  items: StockListRow[];
  q: string;
  view: string;
  window: PageWindow;
  allCount: number;
  lowCount: number;
}) {
  const params = { q: q || undefined, view, size: sizeParam(window.pageSize) };

  return (
    <TableCard
      title="Stock"
      count={window.total}
      countLabel="matching"
      toolbar={
        <ListFilters
          action="/inventory"
          q={q}
          qPlaceholder="Name or colour"
          view={view}
          extras={{ size: sizeParam(window.pageSize) }}
          views={[
            { value: "all", label: "All", count: allCount },
            { value: "low", label: "Low", count: lowCount, tone: lowCount > 0 ? "warning" : "neutral" },
          ]}
          viewOptions={Object.entries(inventoryCategoryLabel).map(([value, label]) => ({ value, label }))}
        />
      }
      footer={<Pagination path="/inventory" params={params} window={window} />}
    >
        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No items match that search.</p>
        ) : (
          <table className={tableClass}>
            <caption className="sr-only">Filtered stock items</caption>
            <thead>
              <tr>
                <th className={thClass}>Item</th>
                <th className={thClass}>Category</th>
                <th className={`${thClass} text-right`}>On hand</th>
                <th className={`${thClass} text-right`}>Reserved</th>
                <th className={`${thClass} text-right`}>Available</th>
                <th className={`${thClass} text-right`}>Reorder</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/inventory/${item.id}`} className={tableLinkClass}>
                      {item.name}
                    </Link>
                    {item.color ? <span className="mt-0.5 block text-sm text-[var(--muted)]">{item.color}</span> : null}
                  </td>
                  <td className={tdClass}>
                    <Chip label={inventoryCategoryLabel[item.category]} />
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatQty(item.onHand, item.unit)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatQty(item.reserved, item.unit)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatQty(item.available, item.unit)}
                    {item.low ? <span className="mt-0.5 block text-sm text-[var(--warning)]">Low</span> : null}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatQty(item.reorderLevel, item.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </TableCard>
  );
}

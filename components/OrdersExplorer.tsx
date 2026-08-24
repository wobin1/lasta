import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { Chip } from "@/components/ui/Chip";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { formatLagosDate } from "@/lib/dates";
import { orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import type { PageWindow } from "@/lib/pagination";
import { sizeParam } from "@/lib/pagination";

const closed: OrderStatus[] = ["CANCELLED", "COMPLETED", "DELIVERED"];

export type OrderListRow = {
  id: string;
  publicId: string;
  status: OrderStatus;
  requiredDate: string;
  totalKobo: number;
  customerName: string;
  salesName: string;
};

export function OrdersExplorer({
  orders,
  todayIso,
  q,
  view,
  window,
  openCount,
  lateCount,
  allCount,
}: {
  orders: OrderListRow[];
  todayIso: string;
  q: string;
  view: string;
  window: PageWindow;
  openCount: number;
  lateCount: number;
  allCount: number;
}) {
  const today = new Date(todayIso);
  const params = { q: q || undefined, view, size: sizeParam(window.pageSize) };

  return (
    <TableCard
      title="Orders"
      count={window.total}
      countLabel="matching"
      toolbar={
        <ListFilters
          action="/orders"
          q={q}
          qPlaceholder="Order ID, customer, or sales"
          view={view}
          extras={{ size: sizeParam(window.pageSize) }}
          views={[
            { value: "open", label: "Open", count: openCount },
            { value: "late", label: "Late", count: lateCount, tone: lateCount > 0 ? "warning" : "neutral" },
            { value: "all", label: "All", count: allCount },
          ]}
        />
      }
      footer={<Pagination path="/orders" params={params} window={window} />}
    >
        {orders.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No orders match that search.</p>
        ) : (
          <table className={tableClass}>
            <caption className="sr-only">Filtered orders</caption>
            <thead>
              <tr>
                <th className={thClass}>Order</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Due</th>
                <th className={`${thClass} text-right`}>Total</th>
                <th className={thClass}>Sales</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const due = new Date(order.requiredDate);
                const late = due < today && !closed.includes(order.status);
                return (
                  <tr key={order.id} className={trClass}>
                    <td className={tdClass}>
                      <Link href={`/orders/${order.id}`} className={tableLinkClass}>
                        {order.publicId}
                      </Link>
                      <span className="mt-0.5 block text-sm text-[var(--muted)]">{order.customerName}</span>
                    </td>
                    <td className={tdClass}>
                      <Chip label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
                    </td>
                    <td className={`${tdClass} tabular-nums`}>
                      <span className={late ? "text-[var(--warning)]" : undefined}>{formatLagosDate(due)}</span>
                      {late ? <span className="mt-0.5 block text-sm text-[var(--muted)]">Late</span> : null}
                    </td>
                    <td className={`${tdClass} text-right tabular-nums`}>{formatNgnFromKobo(order.totalKobo)}</td>
                    <td className={`${tdClass} text-[var(--muted)]`}>{order.salesName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
    </TableCard>
  );
}

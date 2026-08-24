import Link from "next/link";
import { DeliveryStatus } from "@prisma/client";
import { DeliveryProgress, StatusChip, deliveryTone } from "@/components/DeliveryStatus";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { ButtonLink } from "@/components/ui/Button";
import { SummaryStat } from "@/components/ui/Stat";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDate } from "@/lib/dates";
import { deliveryStatusLabel, deliveryTypeLabel } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";
import { paidKobo } from "@/lib/delivery";

export default async function DeliveryQueuePage() {
  const user = await requirePermission("delivery.read");
  const canWrite = can(user.role, "delivery.write");

  const [readyOrders, deliveries] = await Promise.all([
    prisma.order.findMany({
      where: { status: "READY_FOR_DELIVERY", delivery: { is: null } },
      include: { customer: true, payments: true },
      orderBy: { requiredDate: "asc" },
    }),
    prisma.delivery.findMany({
      where: {
        status: { notIn: ["CONFIRMED"] },
      },
      include: { order: { include: { customer: true, payments: true } }, rider: true },
      orderBy: { readyAt: "asc" },
    }),
  ]);

  const mine =
    user.role === "DELIVERY"
      ? deliveries.filter((row) => row.riderUserId === user.id || row.type === "PICKUP" || !row.riderUserId)
      : deliveries;

  const unpaidReady = readyOrders.filter((order) => {
    const balance = order.totalKobo - paidKobo(order.payments);
    return balance > 0 && !order.paymentOverride;
  }).length;

  return (
    <div className={pageClass}>
      <PageHeader
        title="Delivery"
        description="Pickup at the shop, or send with a rider. Unpaid orders cannot leave without an owner or manager override."
        action={
          can(user.role, "reports.read") ? (
            <ButtonLink href="/reports" variant="ghost">
              Reports
            </ButtonLink>
          ) : null
        }
      />

      <ul className="grid gap-4 sm:grid-cols-3">
        <SummaryStat label="Ready to leave" value={String(readyOrders.length)} hint="Passed final QC" />
        <SummaryStat label="Open jobs" value={String(mine.length)} hint="Pickup and rider in progress" />
        <SummaryStat
          label="Unpaid"
          value={String(unpaidReady)}
          hint="Need payment or override before they leave"
          tone={unpaidReady > 0 ? "warning" : "neutral"}
        />
      </ul>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Ready to leave</h2>
          {readyOrders.length > 0 ? (
            <p className="text-sm tabular-nums text-[var(--muted)]">{readyOrders.length} orders</p>
          ) : null}
        </div>
        {readyOrders.length === 0 ? (
          <EmptyState title="Nothing waiting to dispatch" body="Orders appear here after final QC passes." />
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {readyOrders.map((order) => {
              const paid = paidKobo(order.payments);
              const balance = order.totalKobo - paid;
              const unpaid = balance > 0 && !order.paymentOverride;
              const href = `/orders/${order.id}`;
              return (
                <li key={order.id}>
                  <Link
                    href={href}
                    className="block rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[var(--muted)]">Ready for delivery</p>
                      <StatusChip
                        label={unpaid ? "Unpaid" : "Paid"}
                        tone={unpaid ? "warning" : "success"}
                      />
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{order.publicId}</h3>
                    <p className="mt-1 text-[var(--muted)]">{order.customer.fullName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {order.customer.phone} · due {formatLagosDate(order.requiredDate)}
                    </p>
                    <p className="mt-4 text-sm tabular-nums">
                      Balance {formatNgnFromKobo(balance)}
                      {unpaid ? " · override needed to leave" : ""}
                    </p>
                    {canWrite ? (
                      <span className="mt-5 inline-flex min-h-11 items-center text-sm font-medium">
                        Set pickup or rider
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Open deliveries</h2>
          {mine.length > 0 ? (
            <p className="text-sm tabular-nums text-[var(--muted)]">{mine.length} open</p>
          ) : null}
        </div>
        {mine.length === 0 ? (
          <EmptyState title="No open jobs" body="Pickup and rider work you start will sit here until it is complete." />
        ) : (
          <ul className="grid gap-4 xl:grid-cols-2">
            {mine.map((row) => {
              const balance = row.order.totalKobo - paidKobo(row.order.payments);
              const unpaid = balance > 0 && !row.order.paymentOverride;
              return (
                <li key={row.id}>
                  <Link
                    href={`/delivery/${row.id}`}
                    className="block rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-[var(--muted)]">{deliveryTypeLabel[row.type]}</p>
                      <StatusChip
                        label={
                          unpaid && (row.status === "READY" || row.status === "ASSIGNED")
                            ? "Unpaid"
                            : deliveryStatusLabel[row.status as DeliveryStatus]
                        }
                        tone={deliveryTone(
                          row.status as DeliveryStatus,
                          unpaid && (row.status === "READY" || row.status === "ASSIGNED"),
                        )}
                      />
                    </div>
                    <h3 className="mt-3 text-xl font-semibold tracking-tight">{row.order.publicId}</h3>
                    <p className="mt-1 text-[var(--muted)]">{row.order.customer.fullName}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {row.phone}
                      {row.rider ? ` · ${row.rider.name}` : row.type === "RIDER" ? " · Unassigned" : ""}
                    </p>
                    {row.status !== "FAILED" ? (
                      <div className="mt-5">
                        <DeliveryProgress type={row.type} status={row.status} />
                      </div>
                    ) : null}
                    {row.status === "FAILED" && row.failReason ? (
                      <p className="mt-4 text-sm text-[var(--danger)]">{row.failReason}</p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

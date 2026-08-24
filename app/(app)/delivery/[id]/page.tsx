import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AssignRiderForm,
  FailDeliveryForm,
  PickupCollectForm,
  RiderStepForms,
} from "@/components/DeliveryForms";
import { DeliveryProgress, StatusChip, deliveryTone } from "@/components/DeliveryStatus";
import { PageHeader } from "@/components/ui/Field";
import { allowedNext, listRiders } from "@/lib/delivery";
import { formatLagosDate, formatLagosDateTime } from "@/lib/dates";
import { deliveryStatusLabel, deliveryTypeLabel } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function DeliveryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("delivery.read");
  const { id } = await params;
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      rider: true,
      createdBy: true,
      order: { include: { customer: true, payments: true } },
    },
  });
  if (!delivery) notFound();
  const canWrite = can(user.role, "delivery.write");
  const next = allowedNext(delivery.type, delivery.status);
  const riders = canWrite ? await listRiders() : [];
  const paid = delivery.order.payments.reduce((sum, row) => sum + row.amountKobo, 0);
  const balance = delivery.order.totalKobo - paid;
  const blocked = balance > 0 && !delivery.order.paymentOverride;
  const showAssign =
    canWrite &&
    delivery.type === "RIDER" &&
    (delivery.status === "READY" || delivery.status === "FAILED" || !delivery.riderUserId);
  const showPickup = canWrite && delivery.type === "PICKUP" && next.includes("CONFIRMED");
  const showRiderSteps = canWrite && delivery.type === "RIDER" && next.some((step) => step !== "ASSIGNED");
  const showFail = canWrite && delivery.status !== "CONFIRMED" && delivery.status !== "FAILED";
  const nextLabel =
    delivery.type === "PICKUP"
      ? "Customer collected"
      : next.includes("PICKED_UP")
        ? "Picked up from shop"
        : next.includes("IN_TRANSIT")
          ? "In transit"
          : next.includes("DELIVERED")
            ? "Delivered to customer"
            : next.includes("CONFIRMED")
              ? "Confirm complete"
              : showAssign
                ? "Assign a rider"
                : null;

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        title={delivery.order.publicId}
        description={`${delivery.order.customer.fullName} · due ${formatLagosDate(delivery.order.requiredDate)}`}
        backHref="/delivery"
        backLabel="Back to delivery"
      />

      <article className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip label={deliveryTypeLabel[delivery.type]} tone="neutral" />
          <StatusChip
            label={deliveryStatusLabel[delivery.status]}
            tone={deliveryTone(delivery.status, blocked && delivery.status !== "FAILED")}
          />
        </div>
        <div className="mt-6">
          <DeliveryProgress type={delivery.type} status={delivery.status} />
        </div>
        <dl className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--muted)]">Customer</dt>
            <dd className="mt-1 font-medium">{delivery.order.customer.fullName}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Phone</dt>
            <dd className="mt-1 font-medium tabular-nums">{delivery.phone}</dd>
          </div>
          {delivery.address ? (
            <div className="sm:col-span-2">
              <dt className="text-sm text-[var(--muted)]">Address</dt>
              <dd className="mt-1 font-medium">{delivery.address}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-sm text-[var(--muted)]">Balance</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatNgnFromKobo(balance)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Delivery fee</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatNgnFromKobo(delivery.feeKobo)}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Rider</dt>
            <dd className="mt-1 font-medium">
              {delivery.rider ? delivery.rider.name : delivery.type === "RIDER" ? "Unassigned" : "Pickup at shop"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Opened</dt>
            <dd className="mt-1 font-medium">{formatLagosDateTime(delivery.readyAt)}</dd>
          </div>
        </dl>
        {delivery.notes ? <p className="mt-5 text-sm text-[var(--muted)]">{delivery.notes}</p> : null}
        {delivery.status === "FAILED" && delivery.failReason ? (
          <p className="mt-5 rounded-2xl bg-[var(--tint-danger)] px-4 py-3 text-sm text-[var(--danger)]">
            Failed: {delivery.failReason}
          </p>
        ) : null}
        <p className="mt-6">
          <Link
            className="inline-flex min-h-11 items-center text-sm font-medium underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
            href={`/orders/${delivery.orderId}`}
          >
            Open order
          </Link>
        </p>
      </article>

      {blocked ? (
        <p
          role="status"
          className="rounded-[24px] bg-[var(--tint-warning)] px-5 py-4 text-sm text-[var(--warning)]"
        >
          Balance is outstanding. Owner or manager must override unpaid dispatch on the order before this can leave the
          shop.
        </p>
      ) : null}

      {showAssign || showPickup || showRiderSteps ? (
        <section className="space-y-5 rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Next</h2>
            {nextLabel ? <p className="mt-1 text-sm text-[var(--muted)]">{nextLabel}</p> : null}
          </div>
          {showAssign ? <AssignRiderForm deliveryId={delivery.id} riders={riders} /> : null}
          {showPickup ? (
            blocked ? (
              <p className="text-sm text-[var(--muted)]">Clear the balance or add an unpaid-dispatch override first.</p>
            ) : (
              <PickupCollectForm deliveryId={delivery.id} />
            )
          ) : null}
          {showRiderSteps ? (
            blocked && next.includes("PICKED_UP") ? (
              <p className="text-sm text-[var(--muted)]">Clear the balance or add an unpaid-dispatch override first.</p>
            ) : (
              <RiderStepForms deliveryId={delivery.id} next={next} />
            )
          ) : null}
        </section>
      ) : null}

      {showFail ? (
        <section className="space-y-4 rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Mark failed</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">The order stays open so you can assign again.</p>
          </div>
          <FailDeliveryForm deliveryId={delivery.id} />
        </section>
      ) : null}
    </div>
  );
}

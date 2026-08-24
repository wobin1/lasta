import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCustomer } from "@/app/actions/customers";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { CustomerForm } from "@/components/CustomerForm";
import { ActionSheet } from "@/components/ui/Sheet";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { Surface, SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { formatLagosDate, formatLagosDateTime } from "@/lib/dates";
import { customerTypeLabel, orderStatusLabel, orderStatusTone, sourceLabel } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("customers.read");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      measurements: { orderBy: { takenAt: "desc" }, include: { measuredBy: true } },
      orders: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();

  return (
    <div className={pageClass}>
      <PageHeader
        title={customer.fullName}
        description={customer.publicId}
        backHref="/customers"
        backLabel="Back to customers"
        action={
          <div className="flex flex-wrap gap-2">
            {can(user.role, "orders.write") ? (
              <ButtonLink href={`/orders/new?customerId=${customer.id}`}>New order</ButtonLink>
            ) : null}
            {can(user.role, "customers.write") ? (
              <ActionSheet triggerLabel="Edit customer" title="Edit customer" size="compact">
                <p className="mb-4 text-sm text-[var(--muted)]">Phone stays unique. Measurements are versions below.</p>
                <CustomerForm customer={customer} />
              </ActionSheet>
            ) : null}
          </div>
        }
      />

      <SurfaceLg>
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={customerTypeLabel[customer.type]} />
          <Chip label={sourceLabel[customer.source]} />
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-[var(--muted)]">Phone</dt>
            <dd className="mt-1 font-medium">{customer.phone}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Email</dt>
            <dd className="mt-1 font-medium">{customer.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Address</dt>
            <dd className="mt-1 font-medium">{customer.address ?? "—"}</dd>
          </div>
        </dl>
        {customer.notes ? <p className="mt-6 max-w-2xl text-[var(--muted)]">{customer.notes}</p> : null}
      </SurfaceLg>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className={sectionTitleClass}>Measurements</h2>
          {can(user.role, "customers.write") ? (
            <ButtonLink href={`/customers/${customer.id}/measurements/new`} variant="ghost">
              New measurement
            </ButtonLink>
          ) : null}
        </div>
        {customer.measurements.length === 0 ? (
          <EmptyState
            title="No measurement versions yet"
            body="Add a length and width so a new order can attach this customer’s last measure."
            action={
              can(user.role, "customers.write") ? (
                <ButtonLink href={`/customers/${customer.id}/measurements/new`}>New measurement</ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <MeasurementCard
              version={customer.measurements.length}
              measurement={customer.measurements[0]!}
            />
            {customer.measurements.length > 1 ? (
              <CollapsibleSection
                title="Earlier versions"
                summary={`${customer.measurements.length - 1} older`}
              >
                <ul className="grid gap-4 sm:grid-cols-2">
                  {customer.measurements.slice(1).map((m, index) => (
                    <li key={m.id}>
                      <MeasurementCard
                        version={customer.measurements.length - 1 - index}
                        measurement={m}
                      />
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            ) : null}
          </>
        )}
      </section>

      {customer.orders.length === 0 ? (
        <Surface>
          <h2 className={sectionTitleClass}>Orders</h2>
          <p className="mt-3 text-sm text-[var(--muted)]">No orders yet.</p>
        </Surface>
      ) : (
        <TableCard title="Orders" count={customer.orders.length} countLabel="orders">
          <table className={tableClass}>
            <caption className="sr-only">Orders for this customer</caption>
            <thead>
              <tr>
                <th className={thClass}>Order</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Due</th>
                <th className={`${thClass} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((order) => (
                <tr key={order.id} className={trClass}>
                  <td className={tdClass}>
                    <Link href={`/orders/${order.id}`} className={tableLinkClass}>
                      {order.publicId}
                    </Link>
                  </td>
                  <td className={tdClass}>
                    <Chip label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
                  </td>
                  <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                    {formatLagosDate(order.requiredDate)}
                  </td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatNgnFromKobo(order.totalKobo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}

      {can(user.role, "customers.delete") ? (
        customer.orders.length > 0 ? (
          <p className="max-w-xl text-sm text-[var(--muted)]">
            This customer has orders, so the record cannot be deleted.
          </p>
        ) : (
          <ConfirmDelete
            action={deleteCustomer.bind(null, customer.id)}
            label="Delete customer"
            message={`Delete ${customer.fullName}? Measurements on this record will also be removed.`}
          />
        )
      ) : null}
    </div>
  );
}

function MeasurementCard({
  version,
  measurement,
}: {
  version: number;
  measurement: {
    takenAt: Date;
    measuredBy: { name: string };
    leftLength: number | null;
    leftWidth: number | null;
    rightLength: number | null;
    rightWidth: number | null;
    notes: string | null;
  };
}) {
  return (
    <Surface>
      <p className="text-sm text-[var(--muted)]">Version {version}</p>
      <p className="mt-1 font-semibold tracking-tight">{formatLagosDateTime(measurement.takenAt)}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">Taken by {measurement.measuredBy.name}</p>
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-[var(--muted)]">Left</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {fmt(measurement.leftLength)} / {fmt(measurement.leftWidth)} mm
          </dd>
        </div>
        <div>
          <dt className="text-[var(--muted)]">Right</dt>
          <dd className="mt-0.5 font-medium tabular-nums">
            {fmt(measurement.rightLength)} / {fmt(measurement.rightWidth)} mm
          </dd>
        </div>
      </dl>
      {measurement.notes ? <p className="mt-4 text-sm">{measurement.notes}</p> : null}
    </Surface>
  );
}

function fmt(n: number | null) {
  return n == null ? "—" : n;
}

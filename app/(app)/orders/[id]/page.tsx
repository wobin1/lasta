import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteOrder } from "@/app/actions/orders";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { CreateDeliveryForm, PaymentOverrideForm } from "@/components/DeliveryForms";
import { PaymentForm, StatusForm } from "@/components/OrderActions";
import { MaterialsOverrideForm, RetryMaterialsForm } from "@/components/OrderMaterials";
import { ActionSheet } from "@/components/ui/Sheet";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageHeader } from "@/components/ui/Field";
import { SummaryStat } from "@/components/ui/Stat";
import { TabNav } from "@/components/ui/TabNav";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { Surface, SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { formatLagosDate, formatLagosDateTime, startOfTodayLagos } from "@/lib/dates";
import { listRiders, paidKobo } from "@/lib/delivery";
import { asQty, needsHaveShortage, orderMaterialNeeds } from "@/lib/inventory";
import { qcCheckpointLabel } from "@/lib/qc-checklists";
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  deliveryTypeLabel,
  formatQty,
  orderStatusLabel,
  orderStatusTone,
  paymentMethodLabel,
  productionTaskLabel,
  productionTaskTone,
  sourceLabel,
  wasteReasonLabel,
} from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { productionStageLabel } from "@/lib/stages";
import { requirePermission } from "@/lib/session";

const closed = new Set(["CANCELLED", "COMPLETED", "DELIVERED"]);

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requirePermission("orders.read");
  const { id } = await params;
  const { tab: tabRaw } = await searchParams;
  const tab = tabRaw === "floor" || tabRaw === "money" || tabRaw === "dispatch" ? tabRaw : "overview";
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      assignedSales: true,
      items: {
        include: {
          product: true,
          measurement: true,
          productionJob: {
            include: {
              tasks: { orderBy: { sortOrder: "asc" }, include: { worker: true } },
            },
          },
          qualityChecks: {
            orderBy: { createdAt: "desc" },
            include: { inspector: true, defects: true },
          },
        },
      },
      payments: { include: { recordedBy: true }, orderBy: { paidAt: "desc" } },
      wasteRecords: { include: { item: true, createdBy: true }, orderBy: { createdAt: "desc" } },
      delivery: { include: { rider: true } },
    },
  });
  if (!order) notFound();

  const paid = paidKobo(order.payments);
  const balance = order.totalKobo - paid;
  const needs = await orderMaterialNeeds(order.id);
  const short = needsHaveShortage(needs);
  const canSeeStock = can(user.role, "inventory.read");
  const riders = can(user.role, "delivery.write") ? await listRiders() : [];
  const late = order.requiredDate < startOfTodayLagos() && !closed.has(order.status);
  const qcCount = order.items.reduce((sum, item) => sum + item.qualityChecks.length, 0);
  const href = (next: string) => `/orders/${order.id}${next === "overview" ? "" : `?tab=${next}`}`;

  return (
    <div className={pageClass}>
      <PageHeader
        title={order.publicId}
        description={`Due ${formatLagosDate(order.requiredDate)} · ${sourceLabel[order.source]}`}
        backHref="/orders"
        backLabel="Back to orders"
        action={
          <div className="flex flex-wrap gap-2">
            {can(user.role, "orders.write") && order.items.every((item) => !item.productionJob) ? (
              <ButtonLink href={`/orders/${order.id}/edit`}>Edit order</ButtonLink>
            ) : null}
            {can(user.role, "orders.write") ? (
              <ActionSheet triggerLabel="Update status" title="Order status" size="compact">
                <p className="mb-4 text-sm text-[var(--muted)]">
                  Confirming reserves stock and, if materials are enough, creates production tasks. Floor
                  status then comes from those tasks. Use this list for draft, confirm, hold, or cancel.
                </p>
                <StatusForm orderId={order.id} status={order.status} />
              </ActionSheet>
            ) : null}
          </div>
        }
      />

      <SurfaceLg>
        <div className="flex flex-wrap items-center gap-3">
          <Chip label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
          <Chip label={sourceLabel[order.source]} />
          {late ? <Chip label="Late" tone="warning" /> : null}
          {balance > 0 ? <Chip label="Unpaid" tone="warning" /> : null}
          {short ? <Chip label="Short materials" tone="warning" /> : null}
        </div>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-[var(--muted)]">Customer</dt>
            <dd className="mt-1">
              <Link href={`/customers/${order.customer.id}`} className={tableLinkClass}>
                {order.customer.fullName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-[var(--muted)]">Sales</dt>
            <dd className="mt-1 font-medium">{order.assignedSales.name}</dd>
          </div>
        </dl>
        {order.notes ? <p className="mt-6 max-w-2xl text-[var(--muted)]">{order.notes}</p> : null}
      </SurfaceLg>

      <ul className="grid gap-4 sm:grid-cols-3">
        <SummaryStat label="Total" value={formatNgnFromKobo(order.totalKobo)} hint="Order value" />
        <SummaryStat label="Paid" value={formatNgnFromKobo(paid)} hint="Recorded payments" tone="success" />
        <SummaryStat
          label="Balance"
          value={formatNgnFromKobo(balance)}
          hint={balance > 0 ? "Still outstanding" : "Settled"}
          tone={balance > 0 ? "warning" : "success"}
        />
      </ul>

      <TabNav
        label="Order sections"
        current={tab}
        tabs={[
          { id: "overview", label: "Overview", href: href("overview") },
          { id: "floor", label: "Floor", href: href("floor") },
          { id: "money", label: "Money", href: href("money") },
          { id: "dispatch", label: "Dispatch", href: href("dispatch") },
        ]}
      />

      {tab === "overview" ? (
        <TableCard title="Lines" count={order.items.length} countLabel="lines">
          <table className={tableClass}>
            <caption className="sr-only">Order lines</caption>
            <thead>
              <tr>
                <th className={thClass}>Product</th>
                <th className={thClass}>Size</th>
                <th className={`${thClass} text-right`}>Qty</th>
                <th className={`${thClass} text-right`}>Unit</th>
                <th className={`${thClass} text-right`}>Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className={trClass}>
                  <td className={tdClass}>{item.product.name}</td>
                  <td className={tdClass}>{item.size}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{item.quantity}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>{formatNgnFromKobo(item.unitPriceKobo)}</td>
                  <td className={`${tdClass} text-right tabular-nums`}>
                    {formatNgnFromKobo(item.unitPriceKobo * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      ) : null}

      {tab === "floor" ? (
        <>
          <Surface>
            <h2 className={sectionTitleClass}>Production</h2>
            {order.items.every((item) => !item.productionJob) ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Tasks appear after the order is ready for production and the product has a template.
              </p>
            ) : (
              <ul className="mt-5 space-y-4">
                {order.items.map((item) =>
                  item.productionJob ? (
                    <li key={item.id} className="rounded-2xl bg-[var(--ground)] p-5">
                      <p className="font-medium">
                        {item.product.name} · {item.productionJob.templateName}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {item.productionJob.tasks.map((task) => (
                          <li key={task.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="min-w-[7rem]">{productionStageLabel[task.stage]}</span>
                            <Chip label={productionTaskLabel[task.status]} tone={productionTaskTone[task.status]} />
                            <span className="text-[var(--muted)]">
                              {task.worker ? task.worker.name : "Unassigned"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ) : (
                    <li key={item.id} className="text-sm text-[var(--muted)]">
                      {item.product.name} has no production template.
                    </li>
                  ),
                )}
              </ul>
            )}
          </Surface>

          <CollapsibleSection
            title="Quality checks"
            summary={qcCount === 0 ? "None yet" : `${qcCount} check${qcCount === 1 ? "" : "s"}`}
          >
            {qcCount === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Cutting, stitching, lasting, and final QC appear here after inspection.
              </p>
            ) : (
              <ul className="space-y-3">
                {order.items.flatMap((item) =>
                  item.qualityChecks.map((check) => (
                    <li key={check.id} className="rounded-2xl bg-[var(--ground)] p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {item.product.name} · {qcCheckpointLabel[check.checkpoint]}
                        </p>
                        <Chip
                          label={check.result === "PASS" ? "Pass" : "Fail"}
                          tone={check.result === "PASS" ? "success" : "danger"}
                        />
                      </div>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        {formatLagosDateTime(check.createdAt)} · {check.inspector.name}
                        {check.notes ? ` · ${check.notes}` : ""}
                      </p>
                      {check.defects.length > 0 ? (
                        <p className="mt-2 text-sm">Defects: {check.defects.map((defect) => defect.reason).join(", ")}</p>
                      ) : null}
                    </li>
                  )),
                )}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Waste"
            summary={
              order.wasteRecords.length === 0
                ? "None logged"
                : `${order.wasteRecords.length} row${order.wasteRecords.length === 1 ? "" : "s"}`
            }
          >
            {order.wasteRecords.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No waste logged on this order.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <caption className="sr-only">Waste on this order</caption>
                  <thead>
                    <tr>
                      <th className={`${thClass} pl-0`}>When</th>
                      <th className={thClass}>Material</th>
                      <th className={`${thClass} text-right`}>Qty</th>
                      <th className={thClass}>Reason</th>
                      <th className={`${thClass} pr-0`}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.wasteRecords.map((row) => (
                      <tr key={row.id} className={trClass}>
                        <td className={`${tdClass} pl-0 tabular-nums text-[var(--muted)]`}>
                          {formatLagosDateTime(row.createdAt)}
                        </td>
                        <td className={tdClass}>{row.item.name}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>
                          {formatQty(asQty(row.qty), row.item.unit)}
                        </td>
                        <td className={tdClass}>{wasteReasonLabel[row.reason]}</td>
                        <td className={`${tdClass} pr-0 text-[var(--muted)]`}>{row.createdBy.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection
            title="Materials"
            summary={short ? "Shortage — production is blocked or overridden" : needs.length === 0 ? "No bill of materials" : "Covered"}
            defaultOpen={short}
            tone={short ? "warning" : "neutral"}
          >
            {needs.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No bill of materials on these products yet. Confirming will not reserve stock.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className={tableClass}>
                  <caption className="sr-only">Materials needed for this order</caption>
                  <thead>
                    <tr>
                      <th className={`${thClass} pl-0`}>Material</th>
                      <th className={`${thClass} text-right`}>Required</th>
                      <th className={`${thClass} text-right`}>Available</th>
                      <th className={`${thClass} pr-0 text-right`}>Short</th>
                    </tr>
                  </thead>
                  <tbody>
                    {needs.map((need) => (
                      <tr key={need.itemId} className={trClass}>
                        <td className={`${tdClass} pl-0`}>
                          {canSeeStock ? (
                            <Link href={`/inventory/${need.itemId}`} className={tableLinkClass}>
                              {need.name}
                            </Link>
                          ) : (
                            need.name
                          )}
                        </td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatQty(need.required, need.unit)}</td>
                        <td className={`${tdClass} text-right tabular-nums`}>{formatQty(need.available, need.unit)}</td>
                        <td className={`${tdClass} pr-0 text-right tabular-nums`}>
                          {need.short > 0 ? (
                            <>
                              {formatQty(need.short, need.unit)}
                              <span className="mt-0.5 block text-sm text-[var(--warning)]">Short</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {order.materialsOverride ? (
              <p className="mt-4 max-w-xl text-sm text-[var(--muted)]">
                Production was allowed without full materials
                {order.materialsOverrideReason ? `: ${order.materialsOverrideReason}` : "."}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {can(user.role, "orders.write") && order.status === "AWAITING_MATERIALS" ? (
                <RetryMaterialsForm orderId={order.id} />
              ) : null}
              {can(user.role, "materials.override") &&
              short &&
              order.status !== "DRAFT" &&
              order.status !== "CANCELLED" &&
              !order.materialsOverride ? (
                <ActionSheet triggerLabel="Override materials" title="Start without full materials">
                  <MaterialsOverrideForm orderId={order.id} />
                </ActionSheet>
              ) : null}
              {can(user.role, "purchases.write") && short ? (
                <ButtonLink href={`/inventory/purchases/new?orderId=${order.id}`} variant="ghost">
                  Create purchase request from this shortage
                </ButtonLink>
              ) : null}
            </div>
          </CollapsibleSection>
        </>
      ) : null}

      {tab === "money" ? (
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={sectionTitleClass}>Payments</h2>
            {can(user.role, "payments.write") && balance > 0 ? (
              <ActionSheet triggerLabel="Record payment" title="Record payment" variant="primary" size="compact">
                <PaymentForm orderId={order.id} />
              </ActionSheet>
            ) : null}
          </div>
          {order.payments.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">No payments recorded.</p>
          ) : (
            <ul className="mt-5 divide-y divide-[var(--line)]">
              {order.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <span>
                    {paymentMethodLabel[payment.method]}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                    <span className="mt-0.5 block text-[var(--muted)]">
                      {formatLagosDateTime(payment.paidAt)} · {payment.recordedBy.name}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatNgnFromKobo(payment.amountKobo)}</span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      ) : null}

      {tab === "dispatch" ? (
        <Surface>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className={sectionTitleClass}>Delivery</h2>
            <div className="flex flex-wrap gap-2">
              {can(user.role, "payments.override") &&
              balance > 0 &&
              !order.paymentOverride &&
              (order.status === "READY_FOR_DELIVERY" || order.status === "DISPATCHED") ? (
                <ActionSheet triggerLabel="Override unpaid dispatch" title="Allow unpaid dispatch" size="compact">
                  <PaymentOverrideForm orderId={order.id} />
                </ActionSheet>
              ) : null}
              {can(user.role, "delivery.write") && order.status === "READY_FOR_DELIVERY" && !order.delivery ? (
                <ActionSheet triggerLabel="Set pickup or rider" title="Create delivery" variant="primary">
                  <CreateDeliveryForm
                    orderId={order.id}
                    phone={order.customer.phone}
                    address={order.customer.address ?? ""}
                    riders={riders}
                    unpaid={balance > 0 && !order.paymentOverride}
                  />
                </ActionSheet>
              ) : null}
            </div>
          </div>
          {order.delivery ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Chip label={deliveryTypeLabel[order.delivery.type]} />
                <Chip
                  label={deliveryStatusLabel[order.delivery.status]}
                  tone={deliveryStatusTone[order.delivery.status]}
                />
                {order.delivery.rider ? (
                  <span className="text-sm text-[var(--muted)]">{order.delivery.rider.name}</span>
                ) : null}
              </div>
              {can(user.role, "delivery.read") ? (
                <ButtonLink href={`/delivery/${order.delivery.id}`} variant="ghost">
                  Open delivery
                </ButtonLink>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">
              {order.status === "READY_FOR_DELIVERY"
                ? "No pickup or rider job yet."
                : "Dispatch is set up when the order is ready for delivery."}
            </p>
          )}
          {order.paymentOverride ? (
            <p className="mt-4 max-w-xl text-sm text-[var(--muted)]">
              Unpaid dispatch was allowed
              {order.paymentOverrideReason ? `: ${order.paymentOverrideReason}` : "."}
            </p>
          ) : null}
        </Surface>
      ) : null}

      {tab === "overview" && can(user.role, "orders.delete") ? (
        order.payments.length > 0 ? (
          <p className="max-w-xl text-sm text-[var(--muted)]">This order has payments, so it cannot be deleted.</p>
        ) : order.status !== "DRAFT" && order.status !== "CANCELLED" ? (
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Only draft or cancelled orders can be deleted. Change the status first, or leave the record for history.
          </p>
        ) : (
          <ConfirmDelete
            action={deleteOrder.bind(null, order.id)}
            label="Delete order"
            message={`Delete ${order.publicId}? This cannot be undone.`}
          />
        )
      ) : null}
    </div>
  );
}

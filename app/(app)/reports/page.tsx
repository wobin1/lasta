import Link from "next/link";
import { TabNav } from "@/components/ui/TabNav";
import { Button } from "@/components/ui/Button";
import { PageHeader, inputClassName } from "@/components/ui/Field";
import {
  addCalendarDaysLagos,
  dateInputFromDate,
  formatLagosDate,
  formatWait,
  startOfMonthLagos,
  startOfTodayLagos,
} from "@/lib/dates";
import { formatNgnFromKobo } from "@/lib/money";
import { loadOwnerReports } from "@/lib/reports";
import { requirePermission } from "@/lib/session";
import { pageClass } from "@/components/ui/layout";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; tab?: string }>;
}) {
  await requirePermission("reports.read");
  const params = await searchParams;
  const tab = params.tab === "sold" || params.tab === "quality" ? params.tab : "floor";
  const today = startOfTodayLagos();
  const defaultFrom = startOfMonthLagos();
  const from = params.from ? new Date(`${params.from}T00:00:00+01:00`) : defaultFrom;
  const toExclusive = params.to
    ? addCalendarDaysLagos(new Date(`${params.to}T00:00:00+01:00`), 1)
    : addCalendarDaysLagos(today, 1);
  const toInclusive = addCalendarDaysLagos(toExclusive, -1);
  const toInput = dateInputFromDate(toInclusive);
  const fromInput = dateInputFromDate(from);
  const periodLabel = `${formatLagosDate(from)} – ${formatLagosDate(toInclusive)}`;
  const data = await loadOwnerReports(from, toExclusive);
  const qcFailValue =
    data.checkCount === 0 ? "—" : `${Math.round((data.failCount / data.checkCount) * 100)}%`;
  const productMax = Math.max(0, ...data.topProducts.map((row) => row.pairs));
  const colorMax = Math.max(0, ...data.topColors.map((row) => row.pairs));
  const stageMax = Math.max(0, ...data.defectsByStage.map((row) => row.count));
  const workerMax = Math.max(0, ...data.defectsByWorker.map((row) => row.defects));
  const activeStages = data.defectsByStage.filter((row) => row.count > 0);

  return (
    <div className={pageClass}>
      <PageHeader
        title="Reports"
        description={`Sales, late work, waste, and outstanding money for ${periodLabel}. Dates are Africa/Lagos.`}
        action={
          <form
            className="flex flex-col gap-3 rounded-[24px] bg-[var(--surface)] p-3 shadow-[var(--shadow)] sm:flex-row sm:items-end"
            method="get"
          >
            <label className="flex min-w-[11rem] flex-col gap-1.5 text-sm font-medium" htmlFor="from">
              From
              <input
                id="from"
                type="date"
                name="from"
                defaultValue={fromInput}
                className={inputClassName()}
              />
            </label>
            <label className="flex min-w-[11rem] flex-col gap-1.5 text-sm font-medium" htmlFor="to">
              To
              <input
                id="to"
                type="date"
                name="to"
                defaultValue={toInput}
                className={inputClassName()}
              />
            </label>
            <input type="hidden" name="tab" value={tab} />
            <Button type="submit">Apply</Button>
          </form>
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat
          label="Paid in period"
          value={formatNgnFromKobo(data.paidKobo)}
          hint="Cash, transfer, and POS"
          tone="success"
          icon="paid"
        />
        <HeroStat
          label="Outstanding"
          value={formatNgnFromKobo(data.outstandingKobo)}
          hint="Open order balances"
          tone="warning"
          icon="due"
        />
        <HeroStat
          label="Orders in period"
          value={String(data.ordersInPeriod)}
          hint="Created in this range"
          tone="neutral"
          icon="orders"
        />
        <HeroStat
          label="Ready for delivery"
          value={String(data.readyCount)}
          hint="Passed final QC"
          tone="info"
          icon="ready"
        />
      </ul>

      <TabNav
        label="Report sections"
        current={tab}
        tabs={[
          { id: "floor", label: "Floor", href: `/reports?from=${fromInput}&to=${toInput}` },
          { id: "sold", label: "Sold", href: `/reports?from=${fromInput}&to=${toInput}&tab=sold` },
          { id: "quality", label: "Quality", href: `/reports?from=${fromInput}&to=${toInput}&tab=quality` },
        ]}
      />

      {tab === "floor" ? (
        <>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Floor and materials</h2>
        <div className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)] sm:p-8">
          <ul className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Open now" value={String(data.openCount)} hint="Not delivered or cancelled" />
            <Metric
              label="Avg production time"
              value={data.avgProductionDays === null ? "—" : `${data.avgProductionDays} d`}
              hint="Job start to last stage complete"
            />
            <Metric label="Leather waste" value={data.leatherWasteLabel} hint="Leather category this period" />
            <Metric label="Waste vs issued" value={`${data.wastePct}%`} hint="By material cost" />
            <Metric
              label="Materials bought"
              value={formatNgnFromKobo(data.spendKobo)}
              hint="Purchases excluding opening stock"
            />
            <Metric
              label="QC fail rate"
              value={qcFailValue}
              hint={
                data.checkCount === 0
                  ? "No checks this period"
                  : `${data.failCount} fail / ${data.checkCount} checks`
              }
            />
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Still open</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportCard title="Late orders" empty="No open late orders." count={data.overdue.length} countLabel="open">
            {data.overdue.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className={rowLinkClass}
                >
                  <span>
                    <span className="block font-medium">{order.publicId}</span>
                    <span className="block text-sm text-[var(--muted)]">{order.customer.fullName}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">
                    Due {formatLagosDate(order.requiredDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ReportCard>
          <ReportCard
            title="Finishing still waiting"
            empty="Finishing queue is clear."
            count={data.finishingWait.length}
            countLabel="waiting"
          >
            {data.finishingWait.map((row) => (
              <li key={row.id}>
                <Link href={`/orders/${row.orderId}`} className={rowLinkClass}>
                  <span>
                    <span className="block font-medium">{row.publicId}</span>
                    <span className="block text-sm text-[var(--muted)]">{row.productName}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">
                    {formatWait(row.enteredAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ReportCard>
        </div>
      </section>
        </>
      ) : null}

      {tab === "sold" ? (
        <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">What sold</h2>
        <ReportCard title="Products" empty="No order lines in this period." count={data.topProducts.length} countLabel="styles">
          {data.topProducts.map((row) => (
            <li key={row.name} className={rowPadClass}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-medium">{row.name}</span>
                <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{row.pairs} pairs</span>
              </div>
              <ShareBar value={row.pairs} max={productMax} />
              <p className="mt-2 text-sm text-[var(--muted)]">
                {formatNgnFromKobo(row.revenueKobo)} revenue · {formatNgnFromKobo(row.marginKobo)} after BOM cost
              </p>
            </li>
          ))}
        </ReportCard>
        <div className="grid gap-4 lg:grid-cols-2">
          <ReportCard
            title="Colours on sold pairs"
            empty="No material colours on bills of materials for this period."
            count={data.topColors.length}
            countLabel="colours"
          >
            {data.topColors.map((row) => (
              <li key={row.color} className={rowPadClass}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{row.color}</span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{row.pairs} pairs</span>
                </div>
                <ShareBar value={row.pairs} max={colorMax} />
              </li>
            ))}
          </ReportCard>
          <ReportCard
            title="Repeat customers"
            empty="No returning customers ordered in this period."
            count={data.repeatCustomers.length}
            countLabel="returning"
          >
            {data.repeatCustomers.map((row) => (
              <li key={row.id} className={`${rowPadClass} flex min-h-11 items-center justify-between gap-4`}>
                <Link
                  href={`/customers/${row.id}`}
                  className="inline-flex min-h-11 min-w-0 flex-col justify-center rounded-2xl font-medium outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
                >
                  {row.name}
                  <span className="mt-0.5 block text-sm font-normal text-[var(--muted)]">
                    {row.orderCount} orders
                  </span>
                </Link>
                {row.lastOrderId ? (
                  <Link
                    href={`/orders/${row.lastOrderId}`}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-2xl text-sm tabular-nums text-[var(--muted)] outline-offset-2 hover:text-[var(--text)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
                  >
                    {row.lastPublicId}
                  </Link>
                ) : (
                  <span className="text-sm text-[var(--muted)]">—</span>
                )}
              </li>
            ))}
          </ReportCard>
        </div>
      </section>
      ) : null}

      {tab === "quality" ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Quality</h2>
          <div className="grid gap-4 lg:grid-cols-2">
          <ReportCard title="Defects by stage" empty="No defects this period." count={activeStages.length} countLabel="stages">
            {activeStages.map((row) => (
              <li key={row.checkpoint} className={rowPadClass}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{row.label}</span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{row.count}</span>
                </div>
                <ShareBar value={row.count} max={stageMax} />
              </li>
            ))}
          </ReportCard>
          <ReportCard
            title="Defects by worker"
            empty="No worker-linked defects this period."
            count={data.defectsByWorker.length}
            countLabel="workers"
          >
            {data.defectsByWorker.map((row) => (
              <li key={row.name} className={rowPadClass}>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium">{row.name}</span>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--muted)]">{row.defects}</span>
                </div>
                <ShareBar value={row.defects} max={workerMax} />
              </li>
            ))}
          </ReportCard>
          </div>
        </section>
      ) : null}
    </div>
  );
}

const rowPadClass = "py-3 first:pt-0 last:pb-0";
const rowLinkClass =
  "flex min-h-11 items-center justify-between gap-4 rounded-2xl py-2 outline-offset-2 hover:bg-[var(--ground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]";

function HeroStat({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "neutral" | "info" | "warning" | "success";
  icon: "paid" | "due" | "orders" | "ready";
}) {
  const chip =
    tone === "info"
      ? "bg-[var(--tint-info)] text-[var(--info)]"
      : tone === "warning"
        ? "bg-[var(--tint-warning)] text-[var(--warning)]"
        : tone === "success"
          ? "bg-[var(--tint-success)] text-[var(--success)]"
          : "bg-[var(--ground)] text-[var(--text)]";
  return (
    <li className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${chip}`}>
        <HeroIcon name={icon} />
      </div>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text)] tabular-nums xl:text-3xl">
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </li>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <li>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
    </li>
  );
}

function ReportCard({
  title,
  empty,
  count,
  countLabel,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  countLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        {count > 0 ? (
          <p className="text-sm tabular-nums text-[var(--muted)]">
            {count} {countLabel}
          </p>
        ) : null}
      </div>
      {count === 0 ? (
        <p className="py-8 text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">{children}</ul>
      )}
    </section>
  );
}

function ShareBar({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.max(4, Math.round((value / max) * 100));
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--ground)]" aria-hidden>
      <div className="h-full rounded-full bg-[var(--text)]" style={{ width: `${pct}%` }} />
    </div>
  );
}

function HeroIcon({ name }: { name: "paid" | "due" | "orders" | "ready" }) {
  const common = "h-5 w-5";
  if (name === "paid") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 7.5h14v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 10h14M9 14h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (name === "due") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4.5l3 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "orders") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 4h10a2 2 0 0 1 2 2v13l-3.5-2-3.5 2-3.5-2L5 19V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 13.5 9 18.5 20 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

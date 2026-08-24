import Link from "next/link";
import { InventoryUnit, OrderStatus } from "@prisma/client";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { HeroStat } from "@/components/ui/Stat";
import {
  TableCard,
  tableClass,
  tableEmptyClass,
  tableLinkClass,
  tdClass,
  thClass,
  trClass,
} from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDate, greetingLagos, startOfTodayLagos } from "@/lib/dates";
import { asQty, availableQty } from "@/lib/inventory";
import { formatQty, orderStatusLabel, orderStatusTone } from "@/lib/labels";
import { productionStageLabel } from "@/lib/stages";
import { can, homePath, isPhoneHomeRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

const closed: OrderStatus[] = ["CANCELLED", "COMPLETED", "DELIVERED"];

export default async function DashboardPage() {
  const session = await requireSession();
  if (isPhoneHomeRole(session.role)) redirect(homePath(session.role));
  const user = await requirePermission("dashboard.read");
  const today = startOfTodayLagos();

  const showStock = can(user.role, "inventory.read");
  const showBoard = can(user.role, "production.board");
  const showQc = can(user.role, "qc.read");
  const showDelivery = can(user.role, "delivery.read");
  const [openCount, overdueCount, readyCount, , overdue, ready, recent, stockItems, activeWork, qcWaiting, reworkCount] =
    await Promise.all([
      prisma.order.count({ where: { status: { notIn: closed } } }),
      prisma.order.count({
        where: { requiredDate: { lt: today }, status: { notIn: closed } },
      }),
      prisma.order.count({ where: { status: "READY_FOR_DELIVERY" } }),
      prisma.customer.count(),
      prisma.order.findMany({
        where: {
          requiredDate: { lt: today },
          status: { notIn: closed },
        },
        include: { customer: true, assignedSales: true },
        orderBy: { requiredDate: "asc" },
        take: 8,
      }),
      prisma.order.findMany({
        where: { status: "READY_FOR_DELIVERY" },
        include: { customer: true, assignedSales: true },
        orderBy: { requiredDate: "asc" },
        take: 8,
      }),
      prisma.order.findMany({
        include: { customer: true, assignedSales: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      showStock ? prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
      showBoard
        ? prisma.productionTask.findMany({
            where: { status: "STARTED" },
            include: {
              worker: true,
              job: { include: { orderItem: { include: { order: true, product: true } } } },
            },
            take: 8,
            orderBy: { startedAt: "desc" },
          })
        : Promise.resolve([]),
      showQc ? prisma.productionTask.count({ where: { status: "AWAITING_QC" } }) : Promise.resolve(0),
      showQc ? prisma.order.count({ where: { status: "REWORK_REQUIRED" } }) : Promise.resolve(0),
    ]);

  const lowStock = stockItems
    .map((item) => {
      const available = availableQty(item.qtyOnHand, item.qtyReserved);
      const floor = Math.max(asQty(item.minStock), asQty(item.reorderLevel));
      return { ...item, available, floor };
    })
    .filter((item) => item.floor > 0 && item.available <= item.floor)
    .slice(0, 8);

  return (
    <div className={pageClass}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {greetingLagos(user.name ?? "there")}
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--muted)]">
            {showStock
              ? "Open orders, late work, pairs ready to leave, and stock that needs a reorder."
              : "Open orders, late work, and pairs ready to leave the shop."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showQc ? (
            <ButtonLink href="/qc" variant="ghost">
              QC queue
            </ButtonLink>
          ) : null}
          {showDelivery ? (
            <ButtonLink href="/delivery" variant="ghost">
              Delivery
            </ButtonLink>
          ) : null}
          {can(user.role, "reports.read") ? (
            <ButtonLink href="/reports" variant="ghost">
              Reports
            </ButtonLink>
          ) : (
            <ButtonLink href="/orders">View orders</ButtonLink>
          )}
        </div>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroStat label="Open orders" value={String(openCount)} hint="Not delivered or cancelled" />
        <HeroStat
          label="Overdue"
          value={String(overdueCount)}
          hint="Past required date"
          tone="warning"
        />
        <HeroStat
          label="Ready for delivery"
          value={String(readyCount)}
          hint="Passed finishing / QC mark"
          tone="info"
        />
        {showStock ? (
          <HeroStat
            label="Low stock"
            value={String(lowStock.length)}
            hint="At or below reorder"
            tone="warning"
          />
        ) : null}
        {showQc ? (
          <HeroStat
            label="Waiting for QC"
            value={String(qcWaiting)}
            hint="Cutting, stitching, lasting, or final"
            tone="info"
          />
        ) : null}
        {showQc ? (
          <HeroStat
            label="Rework"
            value={String(reworkCount)}
            hint="Failed QC, back on the floor"
            tone="warning"
          />
        ) : null}
      </ul>

      {showStock ? <LowStockGroup items={lowStock} /> : null}
      {showBoard ? (
        <CollapsibleSection
          title="Who is working"
          summary={activeWork.length === 0 ? "No stage in progress" : `${activeWork.length} in progress`}
        >
          <ActiveWorkGroup tasks={activeWork} />
        </CollapsibleSection>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <OrderGroup title="Overdue" empty="No overdue orders." orders={overdue} />
        <OrderGroup
          title="Ready for delivery"
          empty="Nothing is marked ready for delivery."
          orders={ready}
        />
      </div>
      <CollapsibleSection title="Recent orders" summary={`${recent.length} latest`}>
        <OrderGroup title="Recent orders" empty="No orders yet." orders={recent} />
      </CollapsibleSection>
    </div>
  );
}

function OrderGroup({
  title,
  empty,
  orders,
}: {
  title: string;
  empty: string;
  orders: {
    id: string;
    publicId: string;
    status: OrderStatus;
    requiredDate: Date;
    customer: { fullName: string };
    assignedSales: { name: string };
  }[];
}) {
  return (
    <TableCard title={title} count={orders.length} countLabel="orders">
      {orders.length === 0 ? (
        <p className={tableEmptyClass}>{empty}</p>
      ) : (
        <table className={tableClass}>
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Customer</th>
              <th className={thClass}>Status</th>
              <th className={thClass}>Due</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/orders/${order.id}`} className={tableLinkClass}>
                    {order.publicId}
                  </Link>
                </td>
                <td className={tdClass}>{order.customer.fullName}</td>
                <td className={tdClass}>
                  <Chip label={orderStatusLabel[order.status]} tone={orderStatusTone[order.status]} />
                </td>
                <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                  {formatLagosDate(order.requiredDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}

function LowStockGroup({
  items,
}: {
  items: { id: string; name: string; unit: InventoryUnit; available: number; floor: number }[];
}) {
  return (
    <TableCard title="Low stock" count={items.length} countLabel="items">
      {items.length === 0 ? (
        <p className={tableEmptyClass}>Nothing is at or below its reorder level.</p>
      ) : (
        <table className={tableClass}>
          <caption className="sr-only">Items at or below reorder level</caption>
          <thead>
            <tr>
              <th className={thClass}>Item</th>
              <th className={`${thClass} text-right`}>Available</th>
              <th className={`${thClass} text-right`}>Reorder at</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/inventory/${item.id}`} className={tableLinkClass}>
                    {item.name}
                  </Link>
                </td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {formatQty(item.available, item.unit)}
                  <span className="mt-0.5 block text-sm text-[var(--warning)]">Low</span>
                </td>
                <td className={`${tdClass} text-right tabular-nums text-[var(--muted)]`}>
                  {formatQty(item.floor, item.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}

function ActiveWorkGroup({
  tasks,
}: {
  tasks: {
    id: string;
    stage: keyof typeof productionStageLabel;
    worker: { name: string } | null;
    job: {
      orderItem: {
        order: { id: string; publicId: string };
        product: { name: string };
      };
    };
  }[];
}) {
  return (
    <TableCard title="Who is working" count={tasks.length} countLabel="stages">
      {tasks.length === 0 ? (
        <p className={tableEmptyClass}>No stage is in progress right now.</p>
      ) : (
        <table className={tableClass}>
          <caption className="sr-only">Stages in progress</caption>
          <thead>
            <tr>
              <th className={thClass}>Order</th>
              <th className={thClass}>Stage</th>
              <th className={thClass}>Worker</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={trClass}>
                <td className={tdClass}>
                  <Link href={`/orders/${task.job.orderItem.order.id}`} className={tableLinkClass}>
                    {task.job.orderItem.order.publicId}
                  </Link>
                  <span className="mt-0.5 block text-sm text-[var(--muted)]">
                    {task.job.orderItem.product.name}
                  </span>
                </td>
                <td className={tdClass}>{productionStageLabel[task.stage]}</td>
                <td className={tdClass}>{task.worker?.name ?? "Unassigned"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </TableCard>
  );
}

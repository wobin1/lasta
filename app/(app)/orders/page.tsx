import { OrderStatus, Prisma } from "@prisma/client";
import { OrdersExplorer } from "@/components/OrdersExplorer";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { pageClass } from "@/components/ui/layout";
import { startOfTodayLagos } from "@/lib/dates";
import { containsInsensitive, firstParam, paginate, parsePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

const closed: OrderStatus[] = ["CANCELLED", "COMPLETED", "DELIVERED"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; view?: string; size?: string }>;
}) {
  const user = await requirePermission("orders.read");
  const params = await searchParams;
  const today = startOfTodayLagos();
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const view = params.view === "late" || params.view === "all" ? params.view : "open";
  const search: Prisma.OrderWhereInput = q
    ? {
        OR: [
          { publicId: containsInsensitive(q) },
          { customer: { fullName: containsInsensitive(q) } },
          { assignedSales: { name: containsInsensitive(q) } },
        ],
      }
    : {};
  const viewFilter: Prisma.OrderWhereInput =
    view === "open"
      ? { status: { notIn: closed } }
      : view === "late"
        ? { requiredDate: { lt: today }, status: { notIn: closed } }
        : {};
  const where: Prisma.OrderWhereInput = { AND: [search, viewFilter] };

  const [totalAll, openCount, overdueCount, matching] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: { notIn: closed } } }),
    prisma.order.count({ where: { requiredDate: { lt: today }, status: { notIn: closed } } }),
    prisma.order.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const orders = await prisma.order.findMany({
    where,
    include: { customer: true, assignedSales: true },
    orderBy: { createdAt: "desc" },
    skip: window.skip,
    take: window.take,
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Orders"
        description="Every pair of work hangs off an order ID."
        action={
          can(user.role, "orders.write") ? (
            <ButtonLink href="/orders/new">New order</ButtonLink>
          ) : null
        }
      />
      {totalAll === 0 ? (
        <EmptyState title="No orders yet" body="Create a customer and a product, then write the first order." />
      ) : (
        <OrdersExplorer
            todayIso={today.toISOString()}
            q={q}
            view={view}
            window={window}
            openCount={openCount}
            lateCount={overdueCount}
            allCount={totalAll}
            orders={orders.map((order) => ({
              id: order.id,
              publicId: order.publicId,
              status: order.status,
              requiredDate: order.requiredDate.toISOString(),
              totalKobo: order.totalKobo,
              customerName: order.customer.fullName,
              salesName: order.assignedSales.name,
            }))}
          />
      )}
    </div>
  );
}

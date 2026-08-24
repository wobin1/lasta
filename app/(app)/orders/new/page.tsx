import { OrderComposer } from "@/components/OrderComposer";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { dateInputFromDate, formatLagosDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>;
}) {
  await requirePermission("orders.write");
  const { customerId } = await searchParams;
  const [customers, products, measurements] = await Promise.all([
    prisma.customer.findMany({ orderBy: { fullName: "asc" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { category: true },
    }),
    prisma.measurement.findMany({
      orderBy: { takenAt: "desc" },
      select: { id: true, customerId: true, takenAt: true },
    }),
  ]);

  const measurementsByCustomer: Record<string, { id: string; takenAt: string }[]> = {};
  for (const m of measurements) {
    measurementsByCustomer[m.customerId] ??= [];
    measurementsByCustomer[m.customerId].push({
      id: m.id,
      takenAt: formatLagosDateTime(m.takenAt),
    });
  }

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 14);

  return (
    <div className={pageClass}>
      <PageHeader
        title="New order"
        description="Mixed products and sizes are allowed. This saves as a draft. Record a deposit on the order after you save."
        backHref="/orders"
        backLabel="Back to orders"
      />
      {customers.length === 0 || products.length === 0 ? (
        <EmptyState
          title="Cannot write an order yet"
          body="You need at least one customer and one active product before you can write an order."
        />
      ) : (
        <SurfaceLg>
          <OrderComposer
            customers={customers.map((c) => ({
              id: c.id,
              fullName: c.fullName,
              publicId: c.publicId,
            }))}
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              priceKobo: p.priceKobo,
              category: p.category.name,
            }))}
            defaultDate={dateInputFromDate(defaultDate)}
            preselectedCustomerId={customerId}
            measurementsByCustomer={measurementsByCustomer}
          />
        </SurfaceLg>
      )}
    </div>
  );
}

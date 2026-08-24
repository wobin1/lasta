import { notFound } from "next/navigation";
import { OrderComposer } from "@/components/OrderComposer";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { dateInputFromDate, formatLagosDateTime } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("orders.write");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  const existingProductIds = order.items.map((item) => item.productId);
  const [customers, products, measurements] = await Promise.all([
    prisma.customer.findMany({ orderBy: { fullName: "asc" } }),
    prisma.product.findMany({
      where: {
        OR: [{ status: "ACTIVE" }, { id: { in: existingProductIds } }],
      },
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

  return (
    <div className={pageClass}>
      <PageHeader
        title={`Edit ${order.publicId}`}
        description="Change the customer, due date, products, sizes, or notes. Status and payments stay on the order page."
        backHref={`/orders/${order.id}`}
        backLabel={`Back to ${order.publicId}`}
      />
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
        defaultDate={dateInputFromDate(order.requiredDate)}
        measurementsByCustomer={measurementsByCustomer}
        order={{
          id: order.id,
          customerId: order.customerId,
          source: order.source,
          notes: order.notes,
          items: order.items.map((item) => ({
            id: item.id,
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
            measurementId: item.measurementId,
            unitPriceKobo: item.unitPriceKobo,
          })),
        }}
      />
      </SurfaceLg>
    </div>
  );
}

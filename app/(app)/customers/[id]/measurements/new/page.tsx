import { notFound } from "next/navigation";
import { MeasurementForm } from "@/components/MeasurementForm";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function NewMeasurementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("customers.write");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  return (
    <div className={pageClass}>
      <PageHeader
        title={`Measure ${customer.fullName}`}
        description="This adds a new version. Older measurements stay on the customer record."
        backHref={`/customers/${customer.id}`}
        backLabel={`Back to ${customer.fullName}`}
      />
      <SurfaceLg>
        <MeasurementForm customerId={customer.id} />
      </SurfaceLg>
    </div>
  );
}

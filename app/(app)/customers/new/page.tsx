import { CustomerForm } from "@/components/CustomerForm";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { requirePermission } from "@/lib/session";

export default async function NewCustomerPage() {
  await requirePermission("customers.write");
  return (
    <div className={pageClass}>
      <PageHeader
        title="New customer"
        description="Phone is unique. You can add measurements after saving."
        backHref="/customers"
        backLabel="Back to customers"
      />
      <SurfaceLg>
        <CustomerForm />
      </SurfaceLg>
    </div>
  );
}

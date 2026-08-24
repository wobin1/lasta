import { ProductForm } from "@/components/ProductForm";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function NewProductPage() {
  const user = await requirePermission("products.write");
  const [categories, templates] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.productionTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className={pageClass}>
      <PageHeader
        title="New product"
        description="Price is in naira. The system stores kobo. Category must already exist."
        backHref="/products"
        backLabel="Back to products"
      />
      <SurfaceLg>
        <ProductForm
          categories={categories}
          templates={templates}
          canManageCategories={can(user.role, "categories.write")}
        />
      </SurfaceLg>
    </div>
  );
}

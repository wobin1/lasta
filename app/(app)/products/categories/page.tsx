import { CategoryBoard } from "@/components/CategoryForms";
import { PageHeader } from "@/components/ui/Field";
import { pageClass } from "@/components/ui/layout";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function CategoriesPage() {
  await requirePermission("categories.write");
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Categories"
        description="Products pick from this list. Add loafers, school shoes, and other styles the shop sells."
        backHref="/products"
        backLabel="Back to products"
      />
      <CategoryBoard
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          productCount: category._count.products,
        }))}
      />
    </div>
  );
}

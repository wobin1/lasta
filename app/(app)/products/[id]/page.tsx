import { notFound } from "next/navigation";
import { deleteProduct } from "@/app/actions/products";
import { BomEditor } from "@/components/BomEditor";
import { ConfirmDelete } from "@/components/ConfirmDelete";
import { ProductForm } from "@/components/ProductForm";
import { ActionSheet } from "@/components/ui/Sheet";
import { Chip } from "@/components/ui/Chip";
import { PageHeader } from "@/components/ui/Field";
import { tableClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { SurfaceLg, pageClass, sectionTitleClass } from "@/components/ui/layout";
import { asQty } from "@/lib/inventory";
import { formatQty, productStatusLabel, productStatusTone } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePermission("products.read");
  const { id } = await params;
  const [product, categories, stockItems, templates] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        omittedStages: true,
        bomLines: { include: { inventoryItem: true }, orderBy: { inventoryItem: { name: "asc" } } },
        _count: { select: { orderItems: true } },
      },
    }),
    prisma.productCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.inventoryItem.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true },
    }),
    prisma.productionTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();

  const usedOnOrders = product._count.orderItems > 0;

  return (
    <div className={pageClass}>
      <PageHeader
        title={product.name}
        description={`${product.category.name} · about ${product.productionDays} days`}
        backHref="/products"
        backLabel="Back to products"
        action={
          can(user.role, "products.write") ? (
            <ActionSheet triggerLabel="Edit product" title="Edit product">
              <p className="mb-4 text-sm text-[var(--muted)]">Price is naira on the form. The system stores kobo.</p>
              <ProductForm
                product={{
                  id: product.id,
                  name: product.name,
                  categoryId: product.categoryId,
                  description: product.description,
                  priceKobo: product.priceKobo,
                  productionDays: product.productionDays,
                  status: product.status,
                  imageUrl: product.imageUrl,
                  productionTemplateId: product.productionTemplateId,
                  omittedStages: product.omittedStages.map((row) => row.stage),
                }}
                categories={categories}
                templates={templates}
                canManageCategories={can(user.role, "categories.write")}
              />
            </ActionSheet>
          ) : null
        }
      />

      <SurfaceLg>
        <div className="flex flex-wrap items-center gap-2">
          <Chip label={product.category.name} />
          <Chip label={productStatusLabel[product.status]} tone={productStatusTone[product.status]} />
        </div>
        <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
          {formatNgnFromKobo(product.priceKobo)}
        </p>
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="mt-6 max-h-80 w-full rounded-2xl object-cover"
          />
        ) : (
          <div className="mt-6 flex h-40 items-center justify-center rounded-2xl bg-[var(--ground)] text-sm text-[var(--muted)]">
            No photo yet
          </div>
        )}
        {product.description ? <p className="mt-6 max-w-2xl text-[var(--muted)]">{product.description}</p> : null}
      </SurfaceLg>

      <SurfaceLg>
        <h2 className={sectionTitleClass}>Bill of materials</h2>
        <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
          Quantity per pair. Confirming an order reserves this times the pair count.
        </p>
        {can(user.role, "products.write") ? (
          <div className="mt-6">
            <BomEditor
              productId={product.id}
              items={stockItems}
              lines={product.bomLines.map((line) => ({
                inventoryItemId: line.inventoryItemId,
                qtyPerPair: asQty(line.qtyPerPair),
              }))}
            />
          </div>
        ) : product.bomLines.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--muted)]">No materials attached yet.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className={tableClass}>
              <caption className="sr-only">Bill of materials</caption>
              <thead>
                <tr>
                  <th className={`${thClass} pl-0`}>Material</th>
                  <th className={`${thClass} pr-0 text-right`}>Per pair</th>
                </tr>
              </thead>
              <tbody>
                {product.bomLines.map((line) => (
                  <tr key={line.id} className={trClass}>
                    <td className={`${tdClass} pl-0`}>{line.inventoryItem.name}</td>
                    <td className={`${tdClass} pr-0 text-right tabular-nums`}>
                      {formatQty(asQty(line.qtyPerPair), line.unit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SurfaceLg>

      {can(user.role, "products.delete") ? (
        usedOnOrders ? (
          <p className="max-w-xl text-sm text-[var(--muted)]">
            This product is on at least one order, so it cannot be deleted. Archive it instead.
          </p>
        ) : (
          <ConfirmDelete
            action={deleteProduct.bind(null, product.id)}
            label="Delete product"
            message={`Delete ${product.name}? This cannot be undone.`}
          />
        )
      ) : null}
    </div>
  );
}

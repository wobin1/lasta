import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { TableCard } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { productStatusLabel, productStatusTone } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; view?: string; size?: string }>;
}) {
  const user = await requirePermission("products.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const view = params.view === "bom" ? "bom" : "all";
  const search: Prisma.ProductWhereInput = q
    ? {
        OR: [{ name: containsInsensitive(q) }, { category: { name: containsInsensitive(q) } }],
      }
    : {};
  const viewFilter: Prisma.ProductWhereInput = view === "bom" ? { bomLines: { some: {} } } : {};
  const where: Prisma.ProductWhereInput = { AND: [search, viewFilter] };
  const [totalAll, withBom, matching] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { bomLines: { some: {} } } }),
    prisma.product.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    include: { category: true, _count: { select: { bomLines: true } } },
    skip: window.skip,
    take: window.take,
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Products"
        description="Catalogue the styles the shop sells. Attach a bill of materials so confirming an order can reserve stock."
        action={
          <div className="flex flex-wrap gap-2">
            {can(user.role, "categories.write") ? (
              <ButtonLink href="/products/categories" variant="ghost">
                Categories
              </ButtonLink>
            ) : null}
            {can(user.role, "products.write") ? (
              <ButtonLink href="/products/new">New product</ButtonLink>
            ) : null}
          </div>
        }
      />
      {totalAll === 0 ? (
        <EmptyState
          title="No products yet"
          body="Add a loafer or school shoe so sales can write orders."
          action={
            can(user.role, "products.write") ? <ButtonLink href="/products/new">New product</ButtonLink> : null
          }
        />
      ) : (
        <TableCard
          title="Styles"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/products"
              q={q}
              qPlaceholder="Style or category"
              view={view}
              extras={{ size: sizeParam(size) }}
              views={[
                { value: "all", label: "All", count: totalAll },
                {
                  value: "bom",
                  label: "With BOM",
                  count: withBom,
                  tone: withBom === totalAll ? "neutral" : "warning",
                },
              ]}
            />
          }
          footer={
            <Pagination
              path="/products"
              params={{ q: q || undefined, view, size: sizeParam(size) }}
              window={window}
            />
          }
        >
            {products.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No products match that search.</p>
            ) : (
              <ul className="grid gap-6 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/products/${p.id}`}
                      className="block overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)] outline-offset-2 transition-[transform,box-shadow] duration-[var(--motion)] ease-[var(--ease)] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]"
                    >
                      <div className="aspect-[4/3] bg-[var(--ground)]">
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-end p-6 text-sm text-[var(--muted)]">
                            {p.category.name}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2 p-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip label={p.category.name} />
                          <Chip label={productStatusLabel[p.status]} tone={productStatusTone[p.status]} />
                        </div>
                        <p className="text-2xl font-semibold tracking-tight">{p.name}</p>
                        <p className="tabular-nums">{formatNgnFromKobo(p.priceKobo)}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {p._count.bomLines === 0
                            ? "No bill of materials yet"
                            : `${p._count.bomLines} material${p._count.bomLines === 1 ? "" : "s"} per pair`}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </TableCard>
      )}
    </div>
  );
}

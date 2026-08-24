import { InventoryCategory, Prisma } from "@prisma/client";
import { StockExplorer } from "@/components/StockExplorer";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { pageClass } from "@/components/ui/layout";
import { asQty, availableQty } from "@/lib/inventory";
import { inventoryCategoryLabel } from "@/lib/labels";
import { containsInsensitive, firstParam, paginate, parsePageSize } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

function isCategory(value: string): value is InventoryCategory {
  return value in inventoryCategoryLabel;
}

function isLow(item: { qtyOnHand: Prisma.Decimal; qtyReserved: Prisma.Decimal; minStock: Prisma.Decimal; reorderLevel: Prisma.Decimal }) {
  const available = availableQty(item.qtyOnHand, item.qtyReserved);
  return available <= asQty(item.reorderLevel) || available <= asQty(item.minStock);
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; view?: string; size?: string }>;
}) {
  const user = await requirePermission("inventory.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const viewRaw = firstParam(params.view) || "all";
  const category = isCategory(viewRaw) ? viewRaw : undefined;
  const view = viewRaw === "low" || category ? viewRaw : "all";
  const showCost = can(user.role, "inventory.write");
  const search: Prisma.InventoryItemWhereInput = q
    ? {
        OR: [{ name: containsInsensitive(q) }, { color: containsInsensitive(q) }],
      }
    : {};

  const [totalAll, qtyRows] = await Promise.all([
    prisma.inventoryItem.count(),
    prisma.inventoryItem.findMany({
      select: { qtyOnHand: true, qtyReserved: true, minStock: true, reorderLevel: true },
    }),
  ]);
  const lowCount = qtyRows.filter(isLow).length;

  let matching = 0;
  let items: Awaited<ReturnType<typeof prisma.inventoryItem.findMany>> = [];
  let window = paginate(0, params.page, size);

  if (totalAll > 0) {
    if (view === "low") {
      const candidates = await prisma.inventoryItem.findMany({
        where: search,
        orderBy: { name: "asc" },
      });
      const lowItems = candidates.filter(isLow);
      matching = lowItems.length;
      window = paginate(matching, params.page, size);
      items = lowItems.slice(window.skip, window.skip + window.take);
    } else {
      const where: Prisma.InventoryItemWhereInput = {
        AND: [search, category ? { category } : {}],
      };
      matching = await prisma.inventoryItem.count({ where });
      window = paginate(matching, params.page, size);
      items = await prisma.inventoryItem.findMany({
        where,
        orderBy: { name: "asc" },
        skip: window.skip,
        take: window.take,
      });
    }
  }

  return (
    <div className={pageClass}>
      <PageHeader
        title="Stock"
        description="On-hand minus reserved is what sales can still promise. Quantity only changes through a movement."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/inventory/shortages" variant="ghost">
              Shortages
            </ButtonLink>
            <ButtonLink href="/inventory/purchases" variant="ghost">
              Purchases
            </ButtonLink>
            <ButtonLink href="/inventory/transactions" variant="ghost">
              Ledger
            </ButtonLink>
            {can(user.role, "inventory.write") ? <ButtonLink href="/inventory/new">New item</ButtonLink> : null}
          </div>
        }
      />
      {totalAll === 0 ? (
        <EmptyState
          title="No stock items yet"
          body="Add leather, soles, and thread so products can have a bill of materials."
          action={
            can(user.role, "inventory.write") ? <ButtonLink href="/inventory/new">New item</ButtonLink> : null
          }
        />
      ) : (
        <>
          <StockExplorer
            q={q}
            view={view}
            window={window}
            allCount={totalAll}
            lowCount={lowCount}
            items={items.map((item) => {
              const onHand = asQty(item.qtyOnHand);
              const reserved = asQty(item.qtyReserved);
              const available = availableQty(onHand, reserved);
              return {
                id: item.id,
                name: item.name,
                color: item.color,
                category: item.category,
                unit: item.unit,
                onHand,
                reserved,
                available,
                reorderLevel: asQty(item.reorderLevel),
                minStock: asQty(item.minStock),
                low: available <= asQty(item.reorderLevel) || available <= asQty(item.minStock),
              };
            })}
          />
          {!showCost ? (
            <p className="text-sm text-[var(--muted)]">Unit cost is hidden for this role.</p>
          ) : null}
        </>
      )}
    </div>
  );
}

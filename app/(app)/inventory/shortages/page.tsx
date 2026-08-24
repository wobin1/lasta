import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { tableLinkClass } from "@/components/ui/Table";
import { Surface, pageClass } from "@/components/ui/layout";
import { orderMaterialNeeds } from "@/lib/inventory";
import { formatQty } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function ShortagesPage() {
  const user = await requirePermission("inventory.read");
  const orders = await prisma.order.findMany({
    where: { status: { in: ["AWAITING_MATERIALS", "CONFIRMED"] } },
    include: { customer: true },
    orderBy: { requiredDate: "asc" },
  });

  const rows = [];
  for (const order of orders) {
    const needs = await orderMaterialNeeds(order.id);
    const short = needs.filter((need) => need.short > 0);
    if (short.length) {
      rows.push({ order, short });
    }
  }

  return (
    <div className={pageClass}>
      <PageHeader
        title="Shortages"
        description="Open orders that cannot reserve a full bill of materials."
        backHref="/inventory"
        backLabel="Back to stock"
        action={
          can(user.role, "purchases.write") ? (
            <ButtonLink href="/inventory/purchases/new">New purchase request</ButtonLink>
          ) : null
        }
      />
      {rows.length === 0 ? (
        <EmptyState
          title="No shortages"
          body="Confirmed orders either have no BOM yet, or stock covers them."
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map(({ order, short }) => (
            <li key={order.id}>
              <Surface>
                <p className="font-semibold tracking-tight">
                  <Link href={`/orders/${order.id}`} className={tableLinkClass}>
                    {order.publicId}
                  </Link>
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">{order.customer.fullName}</p>
                <ul className="mt-5 space-y-3 text-sm">
                  {short.map((need) => (
                    <li key={need.itemId} className="rounded-2xl bg-[var(--ground)] px-4 py-3">
                      <p className="font-medium">{need.name}</p>
                      <p className="mt-1 text-[var(--muted)]">
                        Need {formatQty(need.required, need.unit)} · available{" "}
                        {formatQty(need.available, need.unit)}
                      </p>
                      <p className="mt-1">
                        Short {formatQty(need.short, need.unit)}
                        <span className="ml-2 text-[var(--warning)]">Low</span>
                      </p>
                    </li>
                  ))}
                </ul>
                {can(user.role, "purchases.write") ? (
                  <div className="mt-5">
                    <ButtonLink href={`/inventory/purchases/new?orderId=${order.id}`} variant="ghost">
                      Create purchase request
                    </ButtonLink>
                  </div>
                ) : null}
              </Surface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

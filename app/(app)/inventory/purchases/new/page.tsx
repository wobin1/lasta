import { PurchaseComposer } from "@/components/PurchaseComposer";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  await requirePermission("purchases.write");
  const { orderId } = await searchParams;
  const items = await prisma.inventoryItem.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="New purchase request"
        description="Draft what to buy. Submit, then owner or manager approves. Receiving adds on-hand stock."
        backHref="/inventory/purchases"
        backLabel="Back to purchases"
      />
      {items.length === 0 ? (
        <EmptyState
          title="No stock items yet"
          body="Add stock items before you write a purchase request."
        />
      ) : (
        <SurfaceLg>
          <PurchaseComposer items={items} orderId={orderId} />
        </SurfaceLg>
      )}
    </div>
  );
}

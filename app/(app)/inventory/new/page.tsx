import { StockItemForm } from "@/components/StockItemForm";
import { PageHeader } from "@/components/ui/Field";
import { SurfaceLg, pageClass } from "@/components/ui/layout";
import { requirePermission } from "@/lib/session";

export default async function NewStockItemPage() {
  await requirePermission("inventory.write");
  return (
    <div className={pageClass}>
      <PageHeader
        title="New stock item"
        description="One workshop location. Use metres, pairs, pieces, or ml — no conversions."
        backHref="/inventory"
        backLabel="Back to stock"
      />
      <SurfaceLg>
        <StockItemForm />
      </SurfaceLg>
    </div>
  );
}

"use client";

import { InventoryCategory, InventoryUnit } from "@prisma/client";
import { useActionState } from "react";
import { createStockItem, updateStockItem, type FormState } from "@/app/actions/inventory";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { inventoryCategoryLabel, inventoryUnitLabel } from "@/lib/labels";

const initial: FormState = {};

export function StockItemForm({
  item,
}: {
  item?: {
    id: string;
    name: string;
    category: InventoryCategory;
    color: string | null;
    type: string | null;
    unit: InventoryUnit;
    minStock: number;
    reorderLevel: number;
    costKobo: number | null;
    supplierName: string | null;
    notes: string | null;
  };
}) {
  const action = item ? updateStockItem.bind(null, item.id) : createStockItem;
  const [state, formAction] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Name" htmlFor="name">
        <input id="name" name="name" required defaultValue={item?.name} className={inputClassName()} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="category">
          <Select
            id="category"
            name="category"
            defaultValue={item?.category ?? "LEATHER"}
            options={(Object.keys(inventoryCategoryLabel) as InventoryCategory[]).map((value) => ({
              value,
              label: inventoryCategoryLabel[value],
            }))}
          />
        </Field>
        <Field label="Unit" htmlFor="unit" hint={item ? "Unit cannot change after stock exists." : "Pairs, pieces, metres, or ml. No conversions."}>
          <Select
            id="unit"
            name="unit"
            defaultValue={item?.unit ?? "METRE"}
            disabled={Boolean(item)}
            options={(Object.keys(inventoryUnitLabel) as InventoryUnit[]).map((value) => ({
              value,
              label: inventoryUnitLabel[value],
            }))}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Colour" htmlFor="color" hint="Optional">
          <input id="color" name="color" defaultValue={item?.color ?? ""} className={inputClassName()} />
        </Field>
        <Field label="Type" htmlFor="type" hint="Optional. Example: cow hide, rubber.">
          <input id="type" name="type" defaultValue={item?.type ?? ""} className={inputClassName()} />
        </Field>
      </div>
      {!item ? (
        <Field label="Opening quantity" htmlFor="openingQty" hint="Recorded as a purchase. Use 0 if the bin is empty.">
          <input id="openingQty" name="openingQty" inputMode="decimal" defaultValue="0" className={inputClassName()} />
        </Field>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum stock" htmlFor="minStock">
          <input id="minStock" name="minStock" inputMode="decimal" defaultValue={item?.minStock ?? 0} className={inputClassName()} />
        </Field>
        <Field label="Reorder level" htmlFor="reorderLevel">
          <input
            id="reorderLevel"
            name="reorderLevel"
            inputMode="decimal"
            defaultValue={item?.reorderLevel ?? 0}
            className={inputClassName()}
          />
        </Field>
      </div>
      <Field label="Cost per unit (₦)" htmlFor="costNaira" hint="Optional. Stored as kobo.">
        <input
          id="costNaira"
          name="costNaira"
          inputMode="decimal"
          defaultValue={item?.costKobo != null ? (item.costKobo / 100).toFixed(2) : ""}
          className={inputClassName()}
        />
      </Field>
      <Field label="Supplier" htmlFor="supplierName" hint="Optional. A name is enough.">
        <input id="supplierName" name="supplierName" defaultValue={item?.supplierName ?? ""} className={inputClassName()} />
      </Field>
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea id="notes" name="notes" rows={3} defaultValue={item?.notes ?? ""} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton>{item ? "Save item" : "Create stock item"}</SubmitButton>
    </form>
  );
}

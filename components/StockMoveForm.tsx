"use client";

import { InventoryTxnType } from "@prisma/client";
import { useActionState } from "react";
import { recordStockMove, type FormState } from "@/app/actions/inventory";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { inventoryTxnLabel } from "@/lib/labels";

const initial: FormState = {};
const types: InventoryTxnType[] = ["PURCHASE", "RETURN", "ADJUSTMENT", "DAMAGE", "STOCK_COUNT"];

export function StockMoveForm({ itemId }: { itemId: string }) {
  const [state, action] = useActionState(recordStockMove.bind(null, itemId), initial);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error ? (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <Field label="Movement" htmlFor="type">
        <Select
          id="type"
          name="type"
          defaultValue="PURCHASE"
          options={types.map((value) => ({ value, label: inventoryTxnLabel[value] }))}
        />
      </Field>
      <Field label="Quantity" htmlFor="qty" hint="Stock count: enter the counted on-hand amount.">
        <input id="qty" name="qty" required inputMode="decimal" className={inputClassName()} />
      </Field>
      <Field label="Adjustment direction" htmlFor="direction" hint="Used only for adjustments.">
        <Select
          id="direction"
          name="direction"
          defaultValue="add"
          options={[
            { value: "add", label: "Add" },
            { value: "remove", label: "Remove" },
          ]}
        />
      </Field>
      <Field label="Reason" htmlFor="reason" hint="Optional. Required in the shop when you reduce stock.">
        <input id="reason" name="reason" className={inputClassName()} />
      </Field>
      <div className="flex items-end">
        <SubmitButton>Record movement</SubmitButton>
      </div>
    </form>
  );
}

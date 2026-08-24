"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createPurchaseRequest, type FormState } from "@/app/actions/purchases";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

const initial: FormState = {};

type Row = { key: string; inventoryItemId: string; qty: string };

export function PurchaseComposer({
  items,
  orderId,
  preset,
}: {
  items: { id: string; name: string }[];
  orderId?: string;
  preset?: { inventoryItemId: string; qty: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    preset?.length
      ? preset.map((line) => ({
          key: line.inventoryItemId,
          inventoryItemId: line.inventoryItemId,
          qty: String(line.qty),
        }))
      : [{ key: "1", inventoryItemId: "", qty: "" }],
  );
  const [state, action] = useActionState(createPurchaseRequest, initial);
  const payload = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((row) => row.inventoryItemId)
          .map((row) => ({ inventoryItemId: row.inventoryItemId, qty: Number(row.qty) })),
      ),
    [rows],
  );

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="lines" value={payload} />
      {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <Field label={`Material ${index + 1}`} htmlFor={`pr-item-${row.key}`}>
              <Select
                id={`pr-item-${row.key}`}
                value={row.inventoryItemId}
                onChange={(value) =>
                  setRows((current) =>
                    current.map((line) =>
                      line.key === row.key ? { ...line, inventoryItemId: value } : line,
                    ),
                  )
                }
                placeholder="Select material"
                options={items.map((item) => ({ value: item.id, label: item.name }))}
              />
            </Field>
            <Field label="Quantity" htmlFor={`pr-qty-${row.key}`}>
              <input
                id={`pr-qty-${row.key}`}
                inputMode="decimal"
                value={row.qty}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((line) => (line.key === row.key ? { ...line, qty: event.target.value } : line)),
                  )
                }
                className={inputClassName()}
              />
            </Field>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setRows((current) => current.filter((line) => line.key !== row.key))}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea id="notes" name="notes" rows={3} className={`${inputClassName()} py-2`} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setRows((current) => [...current, { key: String(Date.now()), inventoryItemId: "", qty: "" }])
          }
        >
          Add line
        </Button>
        <SubmitButton>Create request</SubmitButton>
      </div>
    </form>
  );
}

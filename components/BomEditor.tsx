"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import { saveBom, type FormState } from "@/app/actions/inventory";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { formatQty } from "@/lib/labels";
import type { InventoryUnit } from "@prisma/client";

const initial: FormState = {};

type ItemOption = { id: string; name: string; unit: InventoryUnit };

type Row = { key: string; inventoryItemId: string; qtyPerPair: string };

export function BomEditor({
  productId,
  items,
  lines,
}: {
  productId: string;
  items: ItemOption[];
  lines: { inventoryItemId: string; qtyPerPair: number }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    lines.length
      ? lines.map((line) => ({
          key: line.inventoryItemId,
          inventoryItemId: line.inventoryItemId,
          qtyPerPair: String(line.qtyPerPair),
        }))
      : [{ key: "1", inventoryItemId: "", qtyPerPair: "" }],
  );
  const [state, action] = useActionState(saveBom.bind(null, productId), initial);
  const payload = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((row) => row.inventoryItemId)
          .map((row) => ({ inventoryItemId: row.inventoryItemId, qtyPerPair: Number(row.qtyPerPair) })),
      ),
    [rows],
  );

  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Add stock items first, then attach them here as a bill of materials.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="lines" value={payload} />
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.key} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
            <Field label={`Material ${index + 1}`} htmlFor={`bom-item-${row.key}`}>
              <Select
                id={`bom-item-${row.key}`}
                value={row.inventoryItemId}
                onChange={(value) =>
                  setRows((current) =>
                    current.map((line) =>
                      line.key === row.key ? { ...line, inventoryItemId: value } : line,
                    ),
                  )
                }
                placeholder="Select material"
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.name} (${formatQty(1, item.unit).replace(/^1 /, "")})`,
                }))}
              />
            </Field>
            <Field label="Qty per pair" htmlFor={`bom-qty-${row.key}`}>
              <input
                id={`bom-qty-${row.key}`}
                inputMode="decimal"
                value={row.qtyPerPair}
                onChange={(event) =>
                  setRows((current) =>
                    current.map((line) =>
                      line.key === row.key ? { ...line, qtyPerPair: event.target.value } : line,
                    ),
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
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: String(Date.now()), inventoryItemId: "", qtyPerPair: "" },
            ])
          }
        >
          Add material
        </Button>
        <SubmitButton>Save BOM</SubmitButton>
      </div>
    </form>
  );
}

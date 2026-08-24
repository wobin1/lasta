"use client";

import { CustomerSource } from "@prisma/client";
import { useMemo, useState } from "react";
import { useActionState } from "react";
import { createOrder, updateOrder, type FormState } from "@/app/actions/orders";
import { Button, SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { sourceLabel } from "@/lib/labels";
import { formatNgnFromKobo } from "@/lib/money";

const initial: FormState = {};

type ProductOption = {
  id: string;
  name: string;
  priceKobo: number;
  category: string;
};

type MeasurementOption = {
  id: string;
  takenAt: string;
};

type Line = {
  key: string;
  id?: string;
  productId: string;
  size: string;
  quantity: number;
  measurementId: string;
};

export function OrderComposer({
  customers,
  products,
  defaultDate,
  preselectedCustomerId,
  measurementsByCustomer,
  order,
}: {
  customers: { id: string; fullName: string; publicId: string }[];
  products: ProductOption[];
  defaultDate: string;
  preselectedCustomerId?: string;
  measurementsByCustomer: Record<string, MeasurementOption[]>;
  order?: {
    id: string;
    customerId: string;
    source: CustomerSource;
    notes: string | null;
    items: {
      id: string;
      productId: string;
      size: string;
      quantity: number;
      measurementId: string | null;
      unitPriceKobo: number;
    }[];
  };
}) {
  const [customerId, setCustomerId] = useState(
    order?.customerId ?? preselectedCustomerId ?? "",
  );
  const [lines, setLines] = useState<Line[]>(
    order?.items.length
      ? order.items.map((item) => ({
          key: item.id,
          id: item.id,
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
          measurementId: item.measurementId ?? "",
        }))
      : [{ key: "1", productId: "", size: "", quantity: 1, measurementId: "" }],
  );
  const action = order ? updateOrder.bind(null, order.id) : createOrder;
  const [state, formAction] = useActionState(action, initial);

  const measurements = measurementsByCustomer[customerId] ?? [];
  const itemsJson = useMemo(
    () =>
      JSON.stringify(
        lines
          .filter((line) => line.productId)
          .map((line) => ({
            id: line.id,
            productId: line.productId,
            size: line.size,
            quantity: line.quantity,
            measurementId: line.measurementId || null,
          })),
      ),
    [lines],
  );

  const totalKobo = lines.reduce((sum, line) => {
    const existing = order?.items.find((item) => item.id === line.id);
    const unit =
      existing && existing.productId === line.productId
        ? existing.unitPriceKobo
        : products.find((p) => p.id === line.productId)?.priceKobo ?? 0;
    return sum + unit * line.quantity;
  }, 0);

  function emptyLine(): Line {
    return {
      key: String(Date.now()),
      productId: "",
      size: "",
      quantity: 1,
      measurementId: "",
    };
  }

  return (
    <form action={formAction} className="grid gap-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <input type="hidden" name="items" value={itemsJson} />
      <Field label="Customer" htmlFor="customerId">
        <Select
          id="customerId"
          name="customerId"
          required
          value={customerId}
          onChange={setCustomerId}
          placeholder="Select customer"
          options={customers.map((c) => ({ value: c.id, label: `${c.fullName} · ${c.publicId}` }))}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Required delivery date" htmlFor="requiredDate">
          <input
            id="requiredDate"
            name="requiredDate"
            type="date"
            required
            defaultValue={defaultDate}
            className={inputClassName()}
          />
        </Field>
        <Field label="Order source" htmlFor="source">
          <Select
            id="source"
            name="source"
            defaultValue={order?.source ?? "WALK_IN"}
            options={Object.entries(sourceLabel).map(([value, label]) => ({ value, label }))}
          />
        </Field>
      </div>
      <section aria-labelledby="lines-heading" className="space-y-3">
        <h2 id="lines-heading" className="font-medium">
          Products
        </h2>
        <ul className="space-y-4">
          {lines.map((line, index) => (
            <li
              key={line.key}
              className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--ground)] p-4 sm:grid-cols-2"
            >
              <Field label={`Product ${index + 1}`} htmlFor={`product-${line.key}`}>
                <Select
                  id={`product-${line.key}`}
                  value={line.productId}
                  onChange={(value) =>
                    setLines((current) =>
                      current.map((row) =>
                        row.key === line.key ? { ...row, productId: value } : row,
                      ),
                    )
                  }
                  placeholder="Select product"
                  options={products.map((p) => ({
                    value: p.id,
                    label: `${p.name} · ${formatNgnFromKobo(p.priceKobo)}`,
                  }))}
                />
              </Field>
              <Field label="Size" htmlFor={`size-${line.key}`}>
                <input
                  id={`size-${line.key}`}
                  value={line.size}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((row) =>
                        row.key === line.key ? { ...row, size: e.target.value } : row,
                      ),
                    )
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field label="Quantity (pairs)" htmlFor={`qty-${line.key}`}>
                <input
                  id={`qty-${line.key}`}
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    setLines((current) =>
                      current.map((row) =>
                        row.key === line.key
                          ? { ...row, quantity: Number(e.target.value) || 1 }
                          : row,
                      ),
                    )
                  }
                  className={inputClassName()}
                />
              </Field>
              <Field
                label="Measurement"
                htmlFor={`m-${line.key}`}
                hint="Optional. Uses this customer’s saved versions."
              >
                <Select
                  id={`m-${line.key}`}
                  value={line.measurementId}
                  onChange={(value) =>
                    setLines((current) =>
                      current.map((row) =>
                        row.key === line.key ? { ...row, measurementId: value } : row,
                      ),
                    )
                  }
                  options={[
                    { value: "", label: "None" },
                    ...measurements.map((m) => ({ value: m.id, label: m.takenAt })),
                  ]}
                />
              </Field>
              {lines.length > 1 ? (
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setLines((current) => current.filter((row) => row.key !== line.key))
                    }
                  >
                    Remove this product
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        <Button type="button" variant="ghost" onClick={() => setLines((current) => [...current, emptyLine()])}>
          Add another product
        </Button>
      </section>
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={order?.notes ?? ""}
          className={`${inputClassName()} py-2`}
        />
      </Field>
      <p className="text-lg">
        Total <strong>{formatNgnFromKobo(totalKobo)}</strong>
      </p>
      <SubmitButton>{order ? "Save order" : "Create draft order"}</SubmitButton>
    </form>
  );
}

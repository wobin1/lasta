"use client";

import { ProductionStage } from "@prisma/client";
import { useActionState } from "react";
import { logWaste, type FormState } from "@/app/actions/waste";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { wasteReasonLabel, WASTE_REASONS } from "@/lib/labels";

const initial: FormState = {};

export function WasteForm({
  items,
  taskId,
  orderId,
  stage,
  compact = false,
}: {
  items: { id: string; name: string }[];
  taskId?: string;
  orderId?: string;
  stage?: ProductionStage;
  compact?: boolean;
}) {
  const [state, action] = useActionState(logWaste, initial);
  if (items.length === 0) {
    return <p className="text-sm text-[var(--muted)]">Add a bill of materials before logging waste on this product.</p>;
  }

  return (
    <form action={action} className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2"}>
      {state.error ? (
        <div className={compact ? undefined : "sm:col-span-2"}>
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      {taskId ? <input type="hidden" name="taskId" value={taskId} /> : null}
      {orderId ? <input type="hidden" name="orderId" value={orderId} /> : null}
      {stage ? <input type="hidden" name="stage" value={stage} /> : null}
      <Field label="Material" htmlFor={`waste-item-${taskId ?? "stock"}`}>
        <Select
          id={`waste-item-${taskId ?? "stock"}`}
          name="itemId"
          required
          placeholder="Select material"
          options={items.map((item) => ({ value: item.id, label: item.name }))}
        />
      </Field>
      <Field label="Quantity" htmlFor={`waste-qty-${taskId ?? "stock"}`}>
        <input
          id={`waste-qty-${taskId ?? "stock"}`}
          name="qty"
          required
          inputMode="decimal"
          className={inputClassName()}
        />
      </Field>
      <Field label="Reason" htmlFor={`waste-reason-${taskId ?? "stock"}`}>
        <Select
          id={`waste-reason-${taskId ?? "stock"}`}
          name="reason"
          required
          options={WASTE_REASONS.map((value) => ({ value, label: wasteReasonLabel[value] }))}
        />
      </Field>
      <Field label="Notes" htmlFor={`waste-notes-${taskId ?? "stock"}`} hint="Optional.">
        <input id={`waste-notes-${taskId ?? "stock"}`} name="notes" className={inputClassName()} />
      </Field>
      <div className={compact ? undefined : "sm:col-span-2"}>
        <SubmitButton pendingLabel="Saving…">Log waste</SubmitButton>
      </div>
    </form>
  );
}

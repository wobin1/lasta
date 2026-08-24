"use client";

import { useActionState } from "react";
import { createMeasurement, type FormState } from "@/app/actions/customers";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";

const initial: FormState = {};

function MmField({ id, label }: { id: string; label: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        name={id}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="0"
        className={inputClassName()}
      />
    </Field>
  );
}

export function MeasurementForm({ customerId }: { customerId: string }) {
  const [state, action] = useActionState(
    createMeasurement.bind(null, customerId),
    initial,
  );

  return (
    <form action={action} className="grid max-w-3xl gap-6">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <p className="text-sm text-[var(--muted)]">
        New measurements are saved as a version. Earlier records stay as they are.
        Units are millimetres. Leave a box empty if you did not take that reading.
      </p>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Left foot</legend>
        <MmField id="leftLength" label="Length" />
        <MmField id="leftWidth" label="Width" />
        <MmField id="leftInstep" label="Instep" />
        <MmField id="leftHeel" label="Heel" />
        <MmField id="leftAnkle" label="Ankle" />
      </fieldset>
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-medium">Right foot</legend>
        <MmField id="rightLength" label="Length" />
        <MmField id="rightWidth" label="Width" />
        <MmField id="rightInstep" label="Instep" />
        <MmField id="rightHeel" label="Heel" />
        <MmField id="rightAnkle" label="Ankle" />
      </fieldset>
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea id="notes" name="notes" rows={3} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton>Save measurement</SubmitButton>
    </form>
  );
}

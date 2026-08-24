"use client";

import { useActionState } from "react";
import {
  overrideOrderMaterials,
  retryOrderMaterials,
  type FormState,
} from "@/app/actions/orders";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";

const initial: FormState = {};

export function RetryMaterialsForm({ orderId }: { orderId: string }) {
  return (
    <form action={retryOrderMaterials.bind(null, orderId)}>
      <SubmitButton variant="ghost">Check stock again</SubmitButton>
    </form>
  );
}

export function MaterialsOverrideForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(overrideOrderMaterials.bind(null, orderId), initial);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        label="Why start without full materials?"
        htmlFor="reason"
        hint="This is audited. Owner or manager only."
      >
        <textarea id="reason" name="reason" required rows={3} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton>Override and mark ready for production</SubmitButton>
    </form>
  );
}

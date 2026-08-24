"use client";

import { CustomerSource, CustomerType } from "@prisma/client";
import { useActionState } from "react";
import {
  createCustomer,
  updateCustomer,
  type FormState,
} from "@/app/actions/customers";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { customerTypeLabel, sourceLabel } from "@/lib/labels";

const initial: FormState = {};

export function CustomerForm({
  customer,
}: {
  customer?: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
    type: CustomerType;
    source: CustomerSource;
    notes: string | null;
  };
}) {
  const action = customer
    ? updateCustomer.bind(null, customer.id)
    : createCustomer;
  const [state, formAction] = useActionState(action, initial);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Full name" htmlFor="fullName">
        <input
          id="fullName"
          name="fullName"
          required
          defaultValue={customer?.fullName}
          autoComplete="name"
          className={inputClassName()}
        />
      </Field>
      <Field label="Phone" htmlFor="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          defaultValue={customer?.phone}
          autoComplete="tel"
          className={inputClassName()}
        />
      </Field>
      <Field label="Email" htmlFor="email" hint="Optional">
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={customer?.email ?? ""}
          autoComplete="email"
          className={inputClassName()}
        />
      </Field>
      <Field label="Address" htmlFor="address" hint="Optional">
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={customer?.address ?? ""}
          className={`${inputClassName()} py-2`}
        />
      </Field>
      <Field label="Customer type" htmlFor="type">
        <Select
          id="type"
          name="type"
          defaultValue={customer?.type ?? "INDIVIDUAL"}
          options={Object.entries(customerTypeLabel).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="How they found us" htmlFor="source">
        <Select
          id="source"
          name="source"
          defaultValue={customer?.source ?? "WALK_IN"}
          options={Object.entries(sourceLabel).map(([value, label]) => ({ value, label }))}
        />
      </Field>
      <Field label="Notes" htmlFor="notes" hint="Optional">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          className={`${inputClassName()} py-2`}
        />
      </Field>
      <SubmitButton>{customer ? "Save customer" : "Create customer"}</SubmitButton>
    </form>
  );
}

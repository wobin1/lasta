"use client";

import { OrderStatus, PaymentMethod } from "@prisma/client";
import { useActionState } from "react";
import { recordPayment, updateOrderStatus, type FormState } from "@/app/actions/orders";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { deskStatuses, orderStatusLabel, paymentMethodLabel } from "@/lib/labels";

const initial: FormState = {};

export function StatusForm({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [state, action] = useActionState(updateOrderStatus.bind(null, orderId), initial);
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Order status" htmlFor="status">
        <Select
          id="status"
          name="status"
          defaultValue={status}
          options={[...new Set([status, ...deskStatuses])].map((value) => ({
            value,
            label: orderStatusLabel[value],
          }))}
        />
      </Field>
      <SubmitButton>Update status</SubmitButton>
    </form>
  );
}

export function PaymentForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(recordPayment.bind(null, orderId), initial);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {state.error ? (
        <div className="sm:col-span-2">
          <Alert>{state.error}</Alert>
        </div>
      ) : null}
      <Field label="Amount (₦)" htmlFor="amountNaira">
        <input
          id="amountNaira"
          name="amountNaira"
          required
          inputMode="decimal"
          className={inputClassName()}
        />
      </Field>
      <Field label="Method" htmlFor="method">
        <Select
          id="method"
          name="method"
          defaultValue="CASH"
          options={(Object.keys(paymentMethodLabel) as PaymentMethod[]).map((value) => ({
            value,
            label: paymentMethodLabel[value],
          }))}
        />
      </Field>
      <Field label="Reference" htmlFor="reference" hint="Optional. Transfer or POS slip.">
        <input id="reference" name="reference" className={inputClassName()} />
      </Field>
      <div className="flex items-end">
        <SubmitButton>Record payment</SubmitButton>
      </div>
    </form>
  );
}

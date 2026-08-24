"use client";

import { useActionState, useState } from "react";
import {
  assignRiderAction,
  collectPickupAction,
  confirmDeliveryAction,
  createDeliveryAction,
  deliveredAction,
  failDeliveryAction,
  inTransitAction,
  overrideUnpaidDispatch,
  pickUpAction,
  type FormState,
} from "@/app/actions/delivery";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

const initial: FormState = {};

export function CreateDeliveryForm({
  orderId,
  phone,
  address,
  riders,
  unpaid,
}: {
  orderId: string;
  phone: string;
  address: string;
  riders: { id: string; name: string }[];
  unpaid?: boolean;
}) {
  const [state, action] = useActionState(createDeliveryAction, initial);
  const [type, setType] = useState("PICKUP");
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="orderId" value={orderId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      {unpaid ? (
        <p className="text-sm text-[var(--muted)]">
          Balance is still outstanding. You can set pickup or rider now; the order cannot leave the shop until it is paid or an owner or manager overrides.
        </p>
      ) : null}
      <Field label="How it leaves" htmlFor="type">
        <Select
          id="type"
          name="type"
          required
          defaultValue="PICKUP"
          onChange={setType}
          options={[
            { value: "PICKUP", label: "Customer collects (pickup)" },
            { value: "RIDER", label: "Send with a rider" },
          ]}
        />
      </Field>
      <Field label="Phone" htmlFor="phone" hint="Call this number for pickup or drop-off.">
        <input id="phone" name="phone" required defaultValue={phone} className={inputClassName()} />
      </Field>
      {type === "RIDER" ? (
        <>
          <Field label="Address" htmlFor="address">
            <textarea id="address" name="address" required rows={3} defaultValue={address} className={`${inputClassName()} py-2`} />
          </Field>
          <Field label="Rider" htmlFor="riderUserId" hint="You can assign later from the delivery list.">
            <Select
              id="riderUserId"
              name="riderUserId"
              defaultValue=""
              options={[
                { value: "", label: "Assign later" },
                ...riders.map((rider) => ({ value: rider.id, label: rider.name })),
              ]}
            />
          </Field>
        </>
      ) : null}
      <Field label="Delivery fee (₦)" htmlFor="feeNaira" hint="Use 0 for pickup with no fee.">
        <input id="feeNaira" name="feeNaira" inputMode="decimal" defaultValue="0" className={inputClassName()} />
      </Field>
      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" rows={2} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton pendingLabel="Saving…">Create delivery</SubmitButton>
    </form>
  );
}

export function PaymentOverrideForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(overrideUnpaidDispatch.bind(null, orderId), initial);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field
        label="Why may this unpaid order leave the shop?"
        htmlFor="reason"
        hint="This is audited. Owner or manager only."
      >
        <textarea id="reason" name="reason" required rows={3} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton>Override unpaid dispatch</SubmitButton>
    </form>
  );
}

export function AssignRiderForm({
  deliveryId,
  riders,
}: {
  deliveryId: string;
  riders: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(assignRiderAction, initial);
  if (riders.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No delivery staff accounts yet. Add one under Staff.</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Rider" htmlFor={`rider-${deliveryId}`}>
        <Select
          id={`rider-${deliveryId}`}
          name="riderUserId"
          required
          placeholder="Select rider"
          options={riders.map((rider) => ({ value: rider.id, label: rider.name }))}
        />
      </Field>
      <SubmitButton pendingLabel="Assigning…">Assign</SubmitButton>
    </form>
  );
}

function StepForm({
  deliveryId,
  action,
  label,
  pendingLabel,
  variant = "primary",
}: {
  deliveryId: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "ghost" | "danger";
}) {
  const [state, formAction] = useActionState(action, initial);
  return (
    <form action={formAction}>
      <input type="hidden" name="deliveryId" value={deliveryId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <SubmitButton variant={variant} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  );
}

export function PickupCollectForm({ deliveryId }: { deliveryId: string }) {
  return (
    <StepForm
      deliveryId={deliveryId}
      action={collectPickupAction}
      label="Customer collected"
      pendingLabel="Saving…"
    />
  );
}

export function RiderStepForms({
  deliveryId,
  next,
}: {
  deliveryId: string;
  next: string[];
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {next.includes("PICKED_UP") ? (
        <StepForm deliveryId={deliveryId} action={pickUpAction} label="Picked up from shop" pendingLabel="Saving…" />
      ) : null}
      {next.includes("IN_TRANSIT") ? (
        <StepForm deliveryId={deliveryId} action={inTransitAction} label="In transit" pendingLabel="Saving…" variant="ghost" />
      ) : null}
      {next.includes("DELIVERED") ? (
        <StepForm deliveryId={deliveryId} action={deliveredAction} label="Delivered to customer" pendingLabel="Saving…" />
      ) : null}
      {next.includes("CONFIRMED") ? (
        <StepForm deliveryId={deliveryId} action={confirmDeliveryAction} label="Confirm complete" pendingLabel="Saving…" />
      ) : null}
    </div>
  );
}

export function FailDeliveryForm({ deliveryId }: { deliveryId: string }) {
  const [state, action] = useActionState(failDeliveryAction, initial);
  return (
    <form action={action} className="grid max-w-xl gap-4">
      <input type="hidden" name="deliveryId" value={deliveryId} />
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Why did this fail?" htmlFor="failReason" hint="Required. The order stays open so you can retry.">
        <textarea id="failReason" name="failReason" required rows={3} className={`${inputClassName()} py-2`} />
      </Field>
      <SubmitButton variant="danger" pendingLabel="Saving…">
        Mark failed
      </SubmitButton>
    </form>
  );
}

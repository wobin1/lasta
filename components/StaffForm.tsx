"use client";

import { Role } from "@prisma/client";
import { useActionState } from "react";
import { type FormState } from "@/app/actions/customers";
import { createStaffUser, updateStaffUser } from "@/app/actions/users";
import { SubmitButton } from "@/components/ui/Button";
import { Alert, Field, inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { roleLabel } from "@/lib/permissions";

const initial: FormState = {};

export function StaffForm({
  user,
}: {
  user?: { id: string; name: string; email: string; role: Role };
}) {
  const action = user ? updateStaffUser.bind(null, user.id) : createStaffUser;
  const [state, formAction] = useActionState(action, initial);
  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      {state.error ? <Alert>{state.error}</Alert> : null}
      <Field label="Name" htmlFor="name">
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          defaultValue={user?.name}
          className={inputClassName()}
        />
      </Field>
      <Field label="Email" htmlFor="email">
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="off"
          defaultValue={user?.email}
          className={inputClassName()}
        />
      </Field>
      <Field
        label={user ? "New password" : "Temporary password"}
        htmlFor="password"
        hint={user ? "Leave blank to keep the current password. At least 8 characters if you change it." : "At least 8 characters."}
      >
        <input
          id="password"
          name="password"
          type="password"
          required={!user}
          minLength={8}
          autoComplete="new-password"
          className={inputClassName()}
        />
      </Field>
      <Field label="Role" htmlFor="role">
        <Select
          id="role"
          name="role"
          defaultValue={user?.role ?? "SALES"}
          options={(Object.keys(roleLabel) as Role[]).map((role) => ({ value: role, label: roleLabel[role] }))}
        />
      </Field>
      <SubmitButton>{user ? "Save staff" : "Create staff account"}</SubmitButton>
    </form>
  );
}

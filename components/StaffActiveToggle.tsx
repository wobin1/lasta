"use client";

import { useState } from "react";
import { setStaffActive } from "@/app/actions/users";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function StaffActiveToggle({
  userId,
  name,
  active,
  disabledReason,
}: {
  userId: string;
  name: string;
  active: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  if (disabledReason) {
    return <p className="text-sm text-[var(--muted)]">{disabledReason}</p>;
  }

  const next = !active;
  return (
    <>
      <Button type="button" variant={next ? "ghost" : "danger"} onClick={() => setOpen(true)}>
        {next ? "Activate" : "Deactivate"}
      </Button>
      <ConfirmDialog
        open={open}
        title={next ? `Activate ${name}?` : `Deactivate ${name}?`}
        message={
          next
            ? `${name} will be able to sign in again.`
            : `${name} will not be able to sign in. Order history stays on the system.`
        }
        confirmLabel={next ? "Activate" : "Deactivate"}
        confirmVariant={next ? "primary" : "danger"}
        pendingLabel={next ? "Activating…" : "Deactivating…"}
        action={setStaffActive.bind(null, userId)}
        onClose={() => setOpen(false)}
      >
        <input type="hidden" name="active" value={next ? "true" : "false"} />
      </ConfirmDialog>
    </>
  );
}

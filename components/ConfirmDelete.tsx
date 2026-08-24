"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function ConfirmDelete({
  action,
  label,
  message,
  title,
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  message: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        title={title ?? label}
        message={message}
        confirmLabel={label}
        pendingLabel="Deleting…"
        action={action}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

"use client";

import { useEffect, useId, useRef } from "react";
import { Button, SubmitButton } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  confirmVariant = "danger",
  pendingLabel = "Working…",
  action,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: "primary" | "ghost" | "danger";
  pendingLabel?: string;
  action: (formData: FormData) => void | Promise<void>;
  children?: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    function onCancel(event: Event) {
      event.preventDefault();
      onClose();
    }
    node.addEventListener("cancel", onCancel);
    return () => node.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="confirm-dialog m-auto w-[min(28rem,calc(100%-2rem))] rounded-[24px] border-0 bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow)] backdrop:bg-[var(--text)]/45"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form action={action} className="grid gap-4">
        {children}
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <p id={messageId} className="text-[var(--muted)]">
          {message}
        </p>
        <div className="mt-2 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <SubmitButton variant={confirmVariant} pendingLabel={pendingLabel}>
            {confirmLabel}
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type SheetSize = "compact" | "default";

export function Sheet({
  open,
  title,
  description,
  size = "default",
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  size?: SheetSize;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (open) setExpanded(false);
  }, [open]);

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

  const widthClass = expanded
    ? "xl:w-full xl:rounded-none"
    : size === "compact"
      ? "xl:w-[min(28rem,32vw)] xl:min-w-[24rem]"
      : "xl:w-1/2";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-size={size}
      data-expanded={expanded ? "true" : "false"}
      className={`sheet-dialog m-0 h-dvh max-h-dvh w-full max-w-none border-0 bg-[var(--surface)] p-0 text-[var(--text)] shadow-[var(--shadow)] open:ml-auto open:flex open:flex-col xl:rounded-l-[24px] ${widthClass}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-6 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className="text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p id={descriptionId} className="mt-1 text-sm text-[var(--muted)]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            className="hidden px-3 xl:inline-flex"
            aria-pressed={expanded}
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? "Restore size" : "Full width"}
          </Button>
          <Button type="button" variant="ghost" className="px-0" aria-label="Close panel" onClick={onClose}>
            <CloseGlyph />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}

export function ActionSheet({
  triggerLabel,
  title,
  description,
  variant = "ghost",
  size = "default",
  children,
}: {
  triggerLabel: string;
  title: string;
  description?: string;
  variant?: "primary" | "ghost";
  size?: SheetSize;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        {children}
      </Sheet>
    </>
  );
}

function CloseGlyph() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

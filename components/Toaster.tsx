"use client";

import { useEffect, useRef, useState } from "react";
import { consumeFlash } from "@/app/actions/flash";
import type { FlashToast } from "@/lib/flash-types";

const LIFE_MS = 4500;

export function Toaster({ flash }: { flash?: FlashToast | null }) {
  const [toasts, setToasts] = useState<FlashToast[]>([]);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    if (!flash || seen.current.has(flash.id)) return;
    seen.current.add(flash.id);
    setToasts((current) => [...current, flash]);
    void consumeFlash();
  }, [flash]);

  function dismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-center gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:items-end"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: FlashToast;
  onDismiss: () => void;
}) {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const remainingRef = useRef(LIFE_MS);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismissRef.current(), Math.max(0, remainingRef.current));
    return () => {
      window.clearTimeout(timer);
      remainingRef.current -= Date.now() - started;
    };
  }, [paused]);

  return (
    <div
      role="status"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="toast-enter pointer-events-auto flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-[20px] bg-[var(--surface)] p-4 shadow-[var(--shadow)]"
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--tint-success)] text-[var(--success)]"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.2 6.4 11l6.1-7"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <p className="min-w-0 flex-1 pt-1.5 text-sm font-medium leading-snug text-[var(--text)]">
        {toast.message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--ground)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
        aria-label="Dismiss notification"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

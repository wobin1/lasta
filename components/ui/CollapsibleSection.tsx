"use client";

import { useId, useState } from "react";

export function CollapsibleSection({
  title,
  summary,
  defaultOpen = false,
  tone = "neutral",
  children,
}: {
  title: string;
  summary: string;
  defaultOpen?: boolean;
  tone?: "neutral" | "warning";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const buttonId = useId();
  const panelId = useId();

  return (
    <section className="rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold tracking-tight">
        <button
          type="button"
          id={buttonId}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-6 py-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="min-w-0">
            <span className="block">{title}</span>
            <span
              className={`mt-0.5 block text-sm font-normal ${
                tone === "warning" ? "text-[var(--warning)]" : "text-[var(--muted)]"
              }`}
            >
              {summary}
            </span>
          </span>
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ground)] text-[var(--muted)] transition-transform duration-[var(--motion)] ease-[var(--ease)] ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <ChevronGlyph />
          </span>
        </button>
      </h2>
      {open ? (
        <div id={panelId} role="region" aria-labelledby={buttonId} className="border-t border-[var(--line)] px-6 py-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ChevronGlyph() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

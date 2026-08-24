"use client";

import { useId, useRef } from "react";
import { inputClassName } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";

export type ListViewTab = {
  value: string;
  label: string;
  count?: number;
  tone?: "neutral" | "warning";
};

export function ListFilters({
  action,
  q,
  qPlaceholder,
  view,
  views,
  viewOptions,
  extras,
}: {
  action: string;
  q: string;
  qPlaceholder: string;
  view?: string;
  views?: ListViewTab[];
  viewOptions?: { value: string; label: string }[];
  extras?: Record<string, string | undefined>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const viewRef = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const moreId = useId();
  const countedValues = new Set((views ?? []).map((tab) => tab.value));
  const extraView = view && viewOptions?.some((option) => option.value === view) ? view : "";

  function submitView(next: string) {
    if (viewRef.current) viewRef.current.value = next;
    formRef.current?.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      method="get"
      action={action}
      className="flex flex-col gap-3 lg:flex-row lg:items-center"
    >
      {extras
        ? Object.entries(extras).map(([name, value]) =>
            value ? <input key={name} type="hidden" name={name} value={value} /> : null,
          )
        : null}
      {view !== undefined ? (
        <input key={view} ref={viewRef} type="hidden" name="view" defaultValue={view} />
      ) : null}
      <div className="min-w-0 flex-1 lg:max-w-sm">
        <label htmlFor={searchId} className="sr-only">
          Search
        </label>
        <input
          id={searchId}
          name="q"
          type="search"
          defaultValue={q}
          placeholder={qPlaceholder}
          aria-label="Search"
          className={`${inputClassName()} bg-[var(--ground)]`}
        />
      </div>
      {views?.length || viewOptions?.length ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {views?.length ? (
            <div
              role="group"
              aria-label="Show"
              className="flex flex-wrap gap-1 rounded-2xl bg-[var(--ground)] p-1"
            >
              {views.map((tab) => {
                const selected = view === tab.value;
                const warn = tab.tone === "warning" && (tab.count ?? 0) > 0;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => submitView(tab.value)}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
                      selected
                        ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]"
                        : "text-[var(--muted)] hover:text-[var(--text)]"
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined ? (
                      <span
                        className={`tabular-nums ${
                          warn ? "text-[var(--warning)]" : selected ? "text-[var(--text)]" : "text-[var(--muted)]"
                        }`}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          {viewOptions?.length ? (
            <div className="w-44 shrink-0">
              <label htmlFor={moreId} className="sr-only">
                Category
              </label>
              <Select
                id={moreId}
                value={extraView}
                placeholder="Category"
                options={viewOptions}
                onChange={(value) => submitView(value || (countedValues.has("all") ? "all" : viewOptions[0]!.value))}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}

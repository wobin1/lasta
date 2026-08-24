"use client";

import { useId } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/Select";
import { PAGE_SIZE_OPTIONS, pageHref, sizeParam } from "@/lib/pagination";

export function PageSizeSelect({
  path,
  params,
  pageSize,
}: {
  path: string;
  params: Record<string, string | undefined>;
  pageSize: number;
}) {
  const router = useRouter();
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-[var(--muted)]">
        Rows
      </label>
      <div className="w-[5.75rem]">
        <Select
          id={id}
          value={String(pageSize)}
          options={PAGE_SIZE_OPTIONS.map((option) => ({
            value: String(option),
            label: String(option),
          }))}
          onChange={(value) => {
            const next = Number.parseInt(value, 10);
            if (!Number.isFinite(next) || next === pageSize) return;
            router.push(pageHref(path, { ...params, size: sizeParam(next) }, 1));
          }}
        />
      </div>
    </div>
  );
}

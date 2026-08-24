"use client";

import { Button } from "@/components/ui/Button";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">This page could not be opened</h1>
      <p className="text-[var(--muted)]">
        Try again. If this keeps happening, go back to the list and open the record
        from there, or tell a manager.
      </p>
      <Button
        type="button"
        onClick={() => {
          reset();
          window.location.reload();
        }}
      >
        Try again
      </Button>
    </div>
  );
}

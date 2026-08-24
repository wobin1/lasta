"use client";

import { Button } from "@/components/ui/Button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-[var(--muted)]">
        The page could not be loaded. Try again. If this keeps happening, tell a
        manager.
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
    </main>
  );
}

"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";

export function WasteDisclosure({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="space-y-3 border-t border-[var(--line)] pt-5">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? "Hide waste form" : "Log waste"}
      </Button>
      {open ? (
        <div id={panelId} className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Log extra or scrapped material when you issue stock or finish the stage.
          </p>
          {children}
        </div>
      ) : null}
    </div>
  );
}

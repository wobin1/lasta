import { DeliveryStatus, DeliveryType } from "@prisma/client";
import { Chip, type ChipTone, chipClass } from "@/components/ui/Chip";

export { Chip as StatusChip, chipClass as statusChipClass };
export type { ChipTone };

export function deliveryTone(
  status: DeliveryStatus,
  unpaid?: boolean,
): ChipTone {
  if (unpaid) return "warning";
  if (status === "FAILED") return "danger";
  if (status === "CONFIRMED" || status === "DELIVERED") return "success";
  if (status === "IN_TRANSIT" || status === "PICKED_UP") return "info";
  return "neutral";
}

const PICKUP_STEPS: { id: DeliveryStatus; label: string }[] = [
  { id: "READY", label: "Ready" },
  { id: "CONFIRMED", label: "Collected" },
];

const RIDER_STEPS: { id: DeliveryStatus; label: string }[] = [
  { id: "READY", label: "Ready" },
  { id: "ASSIGNED", label: "Assigned" },
  { id: "PICKED_UP", label: "Picked up" },
  { id: "IN_TRANSIT", label: "In transit" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "CONFIRMED", label: "Complete" },
];

export function DeliveryProgress({
  type,
  status,
}: {
  type: DeliveryType;
  status: DeliveryStatus;
}) {
  const steps = type === "PICKUP" ? PICKUP_STEPS : RIDER_STEPS;
  const currentIndex = status === "FAILED" ? -1 : steps.findIndex((step) => step.id === status);
  const activeIndex = currentIndex < 0 ? 0 : currentIndex;

  return (
    <ol className="flex gap-2 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const current = index === activeIndex && status !== "FAILED";
        return (
          <li
            key={step.id}
            aria-current={current ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                current
                  ? "bg-[var(--text)] text-white"
                  : done
                    ? "bg-[var(--tint-success)] text-[var(--success)]"
                    : "bg-[var(--ground)] text-[var(--muted)]"
              }`}
            >
              {done ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 12.5 9.5 17 19 7.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className={`text-xs font-medium ${current ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

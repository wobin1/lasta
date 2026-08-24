import { chipClass, type ChipTone } from "@/components/ui/Chip";
import { cardClass } from "@/components/ui/layout";

export function SummaryStat({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: ChipTone;
}) {
  return (
    <li className={cardClass}>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p
        className={`mt-1 text-3xl font-semibold tracking-tight tabular-nums ${
          tone === "warning" ? "text-[var(--warning)]" : "text-[var(--text)]"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </li>
  );
}

export function HeroStat({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: ChipTone;
  icon?: React.ReactNode;
}) {
  return (
    <li className={cardClass}>
      {icon ? (
        <div className={`mb-5 flex h-11 w-11 items-center justify-center rounded-2xl ${chipClass(tone)}`}>
          {icon}
        </div>
      ) : null}
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums xl:text-3xl">{value}</p>
      <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p>
    </li>
  );
}

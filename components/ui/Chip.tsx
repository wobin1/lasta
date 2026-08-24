export type ChipTone = "neutral" | "info" | "warning" | "success" | "danger";

export function chipClass(tone: ChipTone) {
  if (tone === "info") return "bg-[var(--tint-info)] text-[var(--info)]";
  if (tone === "warning") return "bg-[var(--tint-warning)] text-[var(--warning)]";
  if (tone === "success") return "bg-[var(--tint-success)] text-[var(--success)]";
  if (tone === "danger") return "bg-[var(--tint-danger)] text-[var(--danger)]";
  return "bg-[var(--ground)] text-[var(--text)]";
}

export function Chip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: ChipTone;
}) {
  return (
    <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-sm font-medium ${chipClass(tone)}`}>
      {label}
    </span>
  );
}

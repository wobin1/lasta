import Link from "next/link";

export function QcNav({ current }: { current: "queue" | "defects" | "waste" }) {
  const items = [
    { href: "/qc", id: "queue" as const, label: "Queue" },
    { href: "/qc/defects", id: "defects" as const, label: "Defects" },
    { href: "/qc/waste", id: "waste" as const, label: "Waste" },
  ];
  return (
    <nav className="flex flex-wrap gap-2" aria-label="QC sections">
      {items.map((item) => {
        const selected = item.id === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)] ${
              selected
                ? "bg-[var(--surface)] text-[var(--text)] shadow-[var(--shadow)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

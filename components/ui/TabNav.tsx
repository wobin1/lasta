import Link from "next/link";

export function TabNav({
  label,
  tabs,
  current,
}: {
  label: string;
  tabs: { id: string; label: string; href: string }[];
  current: string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1">
      {tabs.map((tab) => {
        const selected = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            scroll={false}
            aria-current={selected ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-medium outline-offset-2 transition-colors duration-[var(--motion)] ease-[var(--ease)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)] ${
              selected
                ? "bg-[var(--text)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

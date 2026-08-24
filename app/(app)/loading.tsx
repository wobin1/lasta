export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded-full bg-[var(--line)]" />
        <div className="h-10 w-56 rounded-2xl bg-[var(--line)]" />
        <div className="h-4 w-80 max-w-full rounded-full bg-[var(--line)]" />
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="h-36 rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]" />
        ))}
      </ul>
      <div className="h-72 rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

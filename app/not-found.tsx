export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Not found</h1>
      <p className="text-[var(--muted)]">
        That record is not here. Go back to the list and open it from there.
      </p>
      <a
        href="/dashboard"
        className="inline-flex min-h-11 w-fit items-center rounded-2xl bg-[var(--text)] px-4 text-white"
      >
        Today
      </a>
    </main>
  );
}

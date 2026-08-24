import Link from "next/link";

export function Alert({
  children,
  tone = "error",
}: {
  children: React.ReactNode;
  tone?: "error" | "success";
}) {
  const cls =
    tone === "error"
      ? "border-[var(--danger)] bg-[var(--tint-danger)] text-[var(--danger)]"
      : "border-[var(--success)] bg-[var(--tint-success)] text-[var(--success)]";
  return (
    <p role="alert" className={`rounded-2xl border px-3 py-2 text-sm ${cls}`}>
      {children}
    </p>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-[var(--text)]">
        {label}
      </label>
      {children}
      {hint ? (
        <p id={hintId} className="text-sm text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function inputClassName() {
  return "min-h-11 w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--text)] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[var(--text)]";
}

export function PageHeader({
  title,
  description,
  action,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="flex flex-col gap-3">
      {backHref && backLabel ? (
        <Link
          href={backHref}
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-[var(--muted)] hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text)]"
        >
          ← {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
          {description ? (
            <p className="max-w-2xl text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-[24px] bg-[var(--surface)] px-6 py-10 text-center shadow-[var(--shadow)]">
      <p className="font-semibold tracking-tight">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

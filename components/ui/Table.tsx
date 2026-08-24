export const tableWrapClass =
  "overflow-hidden rounded-[24px] bg-[var(--surface)] shadow-[var(--shadow)]";

export const tableClass = "w-full min-w-[40rem] text-left text-sm";

export const thClass = "px-5 py-3.5 text-sm font-medium text-[var(--muted)]";

export const tdClass = "px-5 py-4 align-middle";

export const trClass =
  "border-t border-[var(--line)] transition-colors duration-[var(--motion)] ease-[var(--ease)] hover:bg-[var(--ground)]";

export const tableLinkClass =
  "inline-flex min-h-11 items-center font-medium outline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--text)]";

export const tableEmptyClass = "px-5 py-10 text-center text-sm text-[var(--muted)]";

export function TableCard({
  title,
  count,
  countLabel,
  toolbar,
  footer,
  children,
}: {
  title: string;
  count: number;
  countLabel: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className={tableWrapClass}>
      <div className="flex flex-col gap-3 px-5 pb-3 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm tabular-nums text-[var(--muted)]">
            {count} {countLabel}
          </p>
        </div>
        {toolbar}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer ? <div className="border-t border-[var(--line)] px-5 py-4">{footer}</div> : null}
    </section>
  );
}

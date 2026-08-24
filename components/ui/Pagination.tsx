import { Button, ButtonLink } from "@/components/ui/Button";
import { PageSizeSelect } from "@/components/ui/PageSizeSelect";
import type { PageWindow } from "@/lib/pagination";
import { pageHref, sizeParam } from "@/lib/pagination";

export function Pagination({
  path,
  params,
  window: page,
}: {
  path: string;
  params: Record<string, string | undefined>;
  window: PageWindow;
}) {
  if (page.total === 0) return null;
  const query = { ...params, size: sizeParam(page.pageSize) };
  const previous = page.page > 1 ? pageHref(path, query, page.page - 1) : null;
  const next = page.page < page.totalPages ? pageHref(path, query, page.page + 1) : null;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <p className="text-sm text-[var(--muted)]" aria-live="polite">
        Showing{" "}
        <span className="tabular-nums font-medium text-[var(--text)]">
          {page.from}–{page.to}
        </span>{" "}
        of <span className="tabular-nums font-medium text-[var(--text)]">{page.total}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PageSizeSelect path={path} params={query} pageSize={page.pageSize} />
        {previous ? (
          <ButtonLink href={previous} variant="ghost">
            Previous
          </ButtonLink>
        ) : (
          <Button type="button" variant="ghost" disabled>
            Previous
          </Button>
        )}
        <p className="min-w-[7rem] text-center text-sm tabular-nums text-[var(--muted)]">
          Page {page.page} of {page.totalPages}
        </p>
        {next ? (
          <ButtonLink href={next} variant="ghost">
            Next
          </ButtonLink>
        ) : (
          <Button type="button" variant="ghost" disabled>
            Next
          </Button>
        )}
      </div>
    </nav>
  );
}

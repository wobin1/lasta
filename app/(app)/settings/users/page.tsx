import Link from "next/link";
import { Prisma } from "@prisma/client";
import { StaffForm } from "@/components/StaffForm";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { ActionSheet } from "@/components/ui/Sheet";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { formatLagosDate } from "@/lib/dates";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { roleLabel } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; view?: string; size?: string }>;
}) {
  await requirePermission("users.write");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const view = params.view === "active" || params.view === "inactive" ? params.view : "all";
  const search: Prisma.UserWhereInput = q
    ? {
        OR: [{ name: containsInsensitive(q) }, { email: containsInsensitive(q) }],
      }
    : {};
  const viewFilter: Prisma.UserWhereInput =
    view === "active" ? { active: true } : view === "inactive" ? { active: false } : {};
  const where: Prisma.UserWhereInput = { AND: [search, viewFilter] };

  const [totalAll, activeCount, inactiveCount, matching] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { active: false } }),
    prisma.user.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const users = await prisma.user.findMany({
    where,
    orderBy: { name: "asc" },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, view, size: sizeParam(size) };

  const newStaff = (
    <ActionSheet
      triggerLabel="New staff"
      title="New staff"
      description="They sign in with this email and the password you set. There is no public signup."
      variant="primary"
      size="compact"
    >
      <StaffForm />
    </ActionSheet>
  );

  return (
    <div className={pageClass}>
      <PageHeader
        title="Staff"
        description="Create logins. Deactivate an account instead of deleting it, so order history stays intact."
        action={newStaff}
      />
      {totalAll === 0 ? (
        <EmptyState
          title="No staff yet"
          body="Create the first login from New staff. Deactivate later instead of deleting, so order history stays intact."
        />
      ) : (
        <TableCard
          title="Staff accounts"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters
              action="/settings/users"
              q={q}
              qPlaceholder="Name or email"
              view={view}
              extras={{ size: sizeParam(size) }}
              views={[
                { value: "all", label: "All", count: totalAll },
                { value: "active", label: "Active", count: activeCount },
                { value: "inactive", label: "Inactive", count: inactiveCount },
              ]}
            />
          }
          footer={<Pagination path="/settings/users" params={query} window={window} />}
        >
              {users.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No staff match that search.</p>
              ) : (
                <table className={tableClass}>
                  <caption className="sr-only">Staff accounts</caption>
                  <thead>
                    <tr>
                      <th className={thClass}>Person</th>
                      <th className={thClass}>Role</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((person) => {
                      const initials = person.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <tr key={person.id} className={trClass}>
                          <td className={tdClass}>
                            <div className="flex items-center gap-3">
                              <span
                                aria-hidden
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--ground)] text-sm font-semibold"
                              >
                                {initials}
                              </span>
                              <span>
                                <Link href={`/settings/users/${person.id}`} className={tableLinkClass}>
                                  {person.name}
                                </Link>
                                <span className="mt-0.5 block text-sm text-[var(--muted)]">{person.email}</span>
                              </span>
                            </div>
                          </td>
                          <td className={tdClass}>
                            <Chip label={roleLabel[person.role]} />
                          </td>
                          <td className={tdClass}>
                            <Chip
                              label={person.active ? "Active" : "Inactive"}
                              tone={person.active ? "success" : "danger"}
                            />
                          </td>
                          <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>
                            {formatLagosDate(person.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
        </TableCard>
      )}
    </div>
  );
}

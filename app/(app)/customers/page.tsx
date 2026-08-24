import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ListFilters } from "@/components/ui/ListFilters";
import { Pagination } from "@/components/ui/Pagination";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { TableCard, tableClass, tableLinkClass, tdClass, thClass, trClass } from "@/components/ui/Table";
import { pageClass } from "@/components/ui/layout";
import { sourceLabel } from "@/lib/labels";
import { containsInsensitive, firstParam, paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { requirePermission } from "@/lib/session";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; size?: string }>;
}) {
  const user = await requirePermission("customers.read");
  const params = await searchParams;
  const q = firstParam(params.q);
  const size = parsePageSize(params.size);
  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { fullName: containsInsensitive(q) },
          { phone: containsInsensitive(q) },
          { publicId: containsInsensitive(q) },
        ],
      }
    : {};
  const [totalAll, matching] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where }),
  ]);
  const window = paginate(matching, params.page, size);
  const customers = await prisma.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true, measurements: true } } },
    skip: window.skip,
    take: window.take,
  });
  const query = { q: q || undefined, size: sizeParam(size) };

  return (
    <div className={pageClass}>
      <PageHeader
        title="Customers"
        description="Phone numbers must stay unique. Open a record for measurements and past orders."
        action={
          can(user.role, "customers.write") ? (
            <ButtonLink href="/customers/new">New customer</ButtonLink>
          ) : null
        }
      />
      {totalAll === 0 ? (
        <EmptyState
          title="No customers yet"
          body="Register the first walk-in so orders and measurements have a home."
        />
      ) : (
        <TableCard
          title="All customers"
          count={window.total}
          countLabel="matching"
          toolbar={
            <ListFilters action="/customers" q={q} qPlaceholder="Name, phone, or ID" extras={{ size: sizeParam(size) }} />
          }
          footer={<Pagination path="/customers" params={query} window={window} />}
        >
            {customers.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted)]">No customers match that search.</p>
            ) : (
              <table className={tableClass}>
                <caption className="sr-only">Customers</caption>
                <thead>
                  <tr>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Phone</th>
                    <th className={thClass}>Source</th>
                    <th className={`${thClass} text-right`}>Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className={trClass}>
                      <td className={tdClass}>
                        <Link href={`/customers/${customer.id}`} className={tableLinkClass}>
                          {customer.fullName}
                        </Link>
                        <span className="mt-0.5 block text-sm text-[var(--muted)]">{customer.publicId}</span>
                      </td>
                      <td className={`${tdClass} tabular-nums text-[var(--muted)]`}>{customer.phone}</td>
                      <td className={tdClass}>
                        <Chip label={sourceLabel[customer.source]} />
                      </td>
                      <td className={`${tdClass} text-right tabular-nums`}>{customer._count.orders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
        </TableCard>
      )}
    </div>
  );
}

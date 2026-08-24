import Link from "next/link";
import { markNotificationsRead } from "@/app/actions/notifications";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { EmptyState, PageHeader } from "@/components/ui/Field";
import { tableLinkClass } from "@/components/ui/Table";
import { Surface, pageClass } from "@/components/ui/layout";
import { formatLagosDateTime } from "@/lib/dates";
import { paginate, parsePageSize, sizeParam } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const user = await requireSession();
  const params = await searchParams;
  const size = parsePageSize(params.size);
  const where = { userId: user.id };
  const [matching, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  const window = paginate(matching, params.page, size);
  const notes = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: window.skip,
    take: window.take,
  });

  return (
    <div className={pageClass}>
      <PageHeader
        title="Notifications"
        description="New work assigned to you appears here."
        action={
          unreadCount > 0 ? (
            <form action={markNotificationsRead}>
              <Button type="submit" variant="ghost">
                Mark all read
              </Button>
            </form>
          ) : null
        }
      />
      {matching === 0 ? (
        <EmptyState title="No notifications" body="When a manager assigns you a stage, it will show up here." />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-3">
            {notes.map((note) => (
              <li key={note.id}>
                <Surface>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className={note.readAt ? "text-[var(--muted)]" : "font-medium"}>{note.body}</p>
                    <Chip label={note.readAt ? "Read" : "Unread"} tone={note.readAt ? "neutral" : "info"} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatLagosDateTime(note.createdAt)}</p>
                  {note.href ? (
                    <p className="mt-3">
                      <Link href={note.href} className={tableLinkClass}>
                        Open
                      </Link>
                    </p>
                  ) : null}
                </Surface>
              </li>
            ))}
          </ul>
          <Pagination path="/notifications" params={{ size: sizeParam(size) }} window={window} />
        </div>
      )}
    </div>
  );
}

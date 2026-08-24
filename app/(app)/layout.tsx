import { AppChrome } from "@/components/AppChrome";
import { readFlash } from "@/lib/flash";
import { unreadNotificationCount } from "@/lib/notifications";
import { requireSession } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireSession();
  const [flash, unreadCount] = await Promise.all([readFlash(), unreadNotificationCount(user.id)]);
  return (
    <AppChrome role={user.role} name={user.name} flash={flash} unreadCount={unreadCount}>
      {children}
    </AppChrome>
  );
}

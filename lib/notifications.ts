import { Role } from "@prisma/client";
import { prisma } from "./prisma";

export async function notify(input: { userId: string; body: string; href?: string | null }) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      body: input.body,
      href: input.href ?? null,
    },
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function notifyRole(role: Role, body: string, href: string) {
  const users = await prisma.user.findMany({
    where: { active: true, role },
    select: { id: true },
  });
  for (const user of users) {
    await notify({ userId: user.id, body, href });
  }
}

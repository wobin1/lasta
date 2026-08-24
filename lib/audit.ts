import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export async function writeAudit(input: {
  actorId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      before: input.before ?? Prisma.JsonNull,
      after: input.after ?? Prisma.JsonNull,
    },
  });
}

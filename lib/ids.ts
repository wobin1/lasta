import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

export async function nextPublicId(kind: "CUS" | "ORD" | "PRQ"): Promise<string> {
  const year = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      year: "numeric",
    }).format(new Date()),
  );

  const seq = await prisma.$transaction(async (tx) => {
    const existing = await tx.idSequence.findUnique({
      where: { kind_year: { kind, year } },
    });
    if (!existing) {
      await tx.idSequence.create({ data: { kind, year, last: 1 } });
      return 1;
    }
    const updated = await tx.idSequence.update({
      where: { kind_year: { kind, year } },
      data: { last: { increment: 1 } },
    });
    return updated.last;
  });

  return `${kind}-${year}-${String(seq).padStart(5, "0")}`;
}

export type JsonValue = Prisma.InputJsonValue;

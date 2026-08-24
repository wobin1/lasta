import { PrismaClient } from "@prisma/client";

const SCHEMA_STAMP = "increment-5-delivery-v1";
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchema?: string;
};

if (globalForPrisma.prisma && globalForPrisma.prismaSchema !== SCHEMA_STAMP) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchema = SCHEMA_STAMP;
}

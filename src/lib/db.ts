import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Production runs on PostgreSQL (provisioned via Vercel Storage — see
// README). Local dev ran on SQLite through the same generic Prisma-client
// API during earlier phases; this is the one-line-adapter swap that
// migration was designed for. See prisma/schema.prisma's datasource line.
const adapter = new PrismaPg(process.env.DATABASE_URL ?? "");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

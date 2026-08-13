import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Local dev runs on SQLite via this adapter. Swapping to PostgreSQL for
// deployment means: change schema.prisma's datasource provider to
// "postgresql", install @prisma/adapter-pg, and replace the adapter below
// with `new PrismaPg({ connectionString: process.env.DATABASE_URL })`.
// The schema itself needs no changes — see prisma/schema.prisma header.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

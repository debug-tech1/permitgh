-- AlterTable
-- Column definitions match what `prisma migrate diff --from-empty` generates
-- for these fields, kept consistent with a from-scratch schema build.
ALTER TABLE "ServiceType" ADD COLUMN "feeGhs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceRequest" ADD COLUMN "feeGhs" INTEGER NOT NULL DEFAULT 0;

-- DataMigration
-- Illustrative fees for the three service types seeded in prisma/seed.ts —
-- not sourced from an actual fee schedule, same assumption basis as SLA
-- days. Written as a migration so it applies safely to the live database.
UPDATE "ServiceType" SET "feeGhs" = 250 WHERE "slug" = 'business-operating-permit';
UPDATE "ServiceType" SET "feeGhs" = 800 WHERE "slug" = 'building-permit';
UPDATE "ServiceType" SET "feeGhs" = 100 WHERE "slug" = 'market-stall-permit';

-- DataMigration
-- Backfill existing requests with the fee that's now current for their
-- service type. This is a best-effort default, not a historically accurate
-- snapshot (no prior fee data exists to snapshot from) — from this point
-- forward, every new request gets its feeGhs set at submission time and it
-- never changes again, same rule as slaDeadline.
UPDATE "ServiceRequest" r
SET "feeGhs" = st."feeGhs"
FROM "ServiceType" st
WHERE r."serviceTypeId" = st.id;

-- AlterTable
-- Column definitions match what `prisma migrate diff --from-empty` generates
-- for these fields, kept consistent with a from-scratch schema build.
ALTER TABLE "ServiceType" ADD COLUMN "feeTiers" JSONB;
ALTER TABLE "ServiceRequest" ADD COLUMN "sizeTier" TEXT;

-- DataMigration
-- Building Permit is the one service where fee genuinely depends on scale —
-- a single-storey building isn't the same job as a multi-storey one.
-- Illustrative tiers, same assumption basis as the flat fees and SLA days.
-- Business Operating Permit and Market Stall Permit stay flat-fee: no
-- comparably obvious size dimension was specified for them.
UPDATE "ServiceType"
SET "feeTiers" = '[
  {"label": "1 storey", "feeGhs": 800},
  {"label": "2 storeys", "feeGhs": 1400},
  {"label": "3+ storeys", "feeGhs": 2200}
]'::jsonb
WHERE "slug" = 'building-permit';

-- AlterTable
-- Column definition matches what `prisma migrate diff --from-empty` generates
-- for this field, kept consistent with a from-scratch schema build.
ALTER TABLE "ServiceType" ADD COLUMN "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- DataMigration
-- Backfills the three service types seeded in prisma/seed.ts. Written as a
-- migration (not a re-seed) so it runs safely against the live database
-- without touching any request/user data submitted since launch.
UPDATE "ServiceType"
SET "requiredDocuments" = ARRAY[
  'Valid Ghana Card (National ID)',
  'Tax Clearance Certificate',
  'Proof of business premises (tenancy agreement or property document)',
  'Previous permit, if renewing'
]::TEXT[]
WHERE "slug" = 'business-operating-permit';

UPDATE "ServiceType"
SET "requiredDocuments" = ARRAY[
  'Site plan or architectural drawings',
  'Proof of land ownership or lease agreement',
  'Valid Ghana Card (National ID)',
  'Structural engineer''s report, for multi-storey buildings'
]::TEXT[]
WHERE "slug" = 'building-permit';

UPDATE "ServiceType"
SET "requiredDocuments" = ARRAY[
  'Valid Ghana Card (National ID)',
  'Passport-sized photograph',
  'Previous stall permit, if renewing'
]::TEXT[]
WHERE "slug" = 'market-stall-permit';

-- AlterTable
-- Column definitions match what `prisma migrate diff --from-empty` generates
-- for these fields, kept consistent with a from-scratch schema build.
-- Nullable at the DB level (existing accounts/requests predate these
-- fields) — required going forward by the registration and request-submission
-- forms/actions respectively, not by a NOT NULL constraint.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "gpsAddress" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "propertyLocation" TEXT;

-- DataMigration
-- Backfill for the two demo citizens seeded before this field existed, so
-- the live demo shows real contact/location data rather than blanks.
UPDATE "User" SET "phone" = '024 555 1234', "gpsAddress" = 'GA-184-9312' WHERE "email" = 'citizen@servetrack.test';
UPDATE "User" SET "phone" = '020 777 5678', "gpsAddress" = 'GA-256-4471' WHERE "email" = 'citizen2@servetrack.test';

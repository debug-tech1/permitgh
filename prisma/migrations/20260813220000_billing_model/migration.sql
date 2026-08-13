-- AlterTable
-- Column definitions match what `prisma migrate diff --from-empty` generates
-- for these fields, kept consistent with a from-scratch schema build.
ALTER TABLE "ServiceRequest" ADD COLUMN "billingDetail" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "waiverGhs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ServiceRequest" ADD COLUMN "waiverReason" TEXT;
ALTER TABLE "ServiceRequest" ADD COLUMN "paidAt" TIMESTAMP(3);

-- DataMigration
-- Building Permit moves from a flat storey-tier list to a rate x area
-- formula (see actions/officer-actions.ts#billBuildingPermit) — it no
-- longer uses feeTiers at all.
UPDATE "ServiceType" SET "feeTiers" = NULL WHERE "slug" = 'building-permit';

-- DataMigration
-- Business Operating Permit moves from one flat fee to officer-billed
-- business categories, the same tier mechanism Building Permit used to use.
-- Illustrative categories/fees, same assumption basis as everything else.
UPDATE "ServiceType"
SET "feeTiers" = '[
  {"label": "Retail / Trading", "feeGhs": 200},
  {"label": "Food & Beverage / Restaurant", "feeGhs": 350},
  {"label": "Professional Services", "feeGhs": 300},
  {"label": "Wholesale / Distribution", "feeGhs": 450},
  {"label": "Manufacturing / Industrial", "feeGhs": 600},
  {"label": "Financial Services", "feeGhs": 800}
]'::jsonb
WHERE "slug" = 'business-operating-permit';

-- DataMigration
-- New service: Property Rate. Fee depends on property type and purpose of
-- use, modeled as the same label+fee tier list as BOP's categories above —
-- same mechanism, different labels. feeGhs is the "from" price shown before
-- billing (lowest tier).
INSERT INTO "ServiceType" ("id", "name", "slug", "slaDays", "description", "requiredDocuments", "feeGhs", "feeTiers", "createdAt")
VALUES (
  gen_random_uuid(),
  'Property Rate',
  'property-rate',
  10,
  'Annual property rate assessment, based on the property''s type and purpose of use.',
  ARRAY[
    'Valid Ghana Card (National ID)',
    'Proof of property ownership (title deed or indenture)',
    'Previous property rate receipt, if renewing'
  ]::TEXT[],
  150,
  '[
    {"label": "Residential — Owner-occupied", "feeGhs": 150},
    {"label": "Residential — Rented / Investment", "feeGhs": 300},
    {"label": "Commercial — Business use", "feeGhs": 600},
    {"label": "Industrial — Business use", "feeGhs": 900}
  ]'::jsonb,
  now()
);

-- DataMigration
-- The officer for the new Property Rate queue. Password matches every
-- other seeded account ("Password123!") — see Deployment_and_Source_Links.
INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "assignedServiceTypeId", "createdAt")
VALUES (
  gen_random_uuid(),
  'Officer Asante',
  'officer.property@servetrack.test',
  '$2b$10$ElA39.0ckexPtim4zv6WaOv8vd4uWrHoPebyw8b/oFm/GuANrb.Iy',
  'officer',
  (SELECT "id" FROM "ServiceType" WHERE "slug" = 'property-rate'),
  now()
);

-- DataMigration
-- Cost for Building Permit and Business Operating Permit is now billed by
-- an officer (formula or category respectively), not auto-applied at
-- submission. Any still-open request for either service had its fee set
-- under the old model — reset it to "pending billing" so an officer must
-- bill it under the new rules before it can be approved. Already-resolved
-- requests keep their historical fee unchanged.
UPDATE "ServiceRequest" r
SET "feeGhs" = NULL, "sizeTier" = NULL
FROM "ServiceType" st
WHERE r."serviceTypeId" = st.id
  AND st."slug" IN ('building-permit', 'business-operating-permit')
  AND r."status" NOT IN ('approved', 'rejected');

-- DataMigration
-- Payment confirmation is a new required step before approval, for every
-- service. Already-approved requests predate that rule; back-fill paidAt
-- for them so historical data doesn't read as "unpaid" — they were, in
-- effect, paid (that's how they got approved under the old flow).
UPDATE "ServiceRequest"
SET "paidAt" = "resolvedAt"
WHERE "status" = 'approved' AND "resolvedAt" IS NOT NULL;

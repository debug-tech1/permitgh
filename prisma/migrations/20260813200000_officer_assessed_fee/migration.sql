-- AlterTable
-- feeGhs becomes nullable: null now means "not yet assessed" for a tiered
-- service, distinct from a real GH₵0 fee.
ALTER TABLE "ServiceRequest" ALTER COLUMN "feeGhs" DROP NOT NULL;
ALTER TABLE "ServiceRequest" ALTER COLUMN "feeGhs" DROP DEFAULT;

-- DataMigration
-- Cost for tiered services (currently just Building Permit) is now an
-- officer's call, not something the applicant self-selects. Any Building
-- Permit request still open had its fee self-selected under the old flow —
-- reset it to "pending assessment" so an officer must confirm it before the
-- request can be approved. Already-resolved requests keep their historical
-- fee unchanged; that record shouldn't move after the fact.
UPDATE "ServiceRequest" r
SET "feeGhs" = NULL, "sizeTier" = NULL
FROM "ServiceType" st
WHERE r."serviceTypeId" = st.id
  AND st."feeTiers" IS NOT NULL
  AND r."status" NOT IN ('approved', 'rejected');

-- DataMigration
-- System rebrand: ServeTrack -> PermitGH. The seeded test accounts' email
-- domain moves with it, so the documented credentials stay correct rather
-- than pointing at a name the app no longer displays anywhere.
UPDATE "User"
SET "email" = REPLACE("email", '@servetrack.test', '@permitgh.test')
WHERE "email" LIKE '%@servetrack.test';

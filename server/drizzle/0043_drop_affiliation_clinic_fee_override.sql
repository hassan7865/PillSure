ALTER TABLE "doctor_practice_affiliations"
DROP COLUMN IF EXISTS "clinic_id";

ALTER TABLE "doctor_practice_affiliations"
DROP COLUMN IF EXISTS "fee_pkr_override";

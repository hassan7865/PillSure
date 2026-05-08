ALTER TABLE "doctors" DROP CONSTRAINT IF EXISTS "doctors_hospitalId_hospitals_id_fk";
DROP INDEX IF EXISTS "IDX_doctors_hospitalId";
ALTER TABLE "doctors" DROP COLUMN IF EXISTS "hospitalId";


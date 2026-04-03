-- Map drug category → specialization by FK (specializations.id), not varchar name

ALTER TABLE "drug_category_specialization_mapping" ADD COLUMN "specialization_id" integer;

UPDATE "drug_category_specialization_mapping" m
SET "specialization_id" = s."id"
FROM "specializations" s
WHERE LOWER(TRIM(m."specialization")) = LOWER(TRIM(s."name"));

DELETE FROM "drug_category_specialization_mapping" WHERE "specialization_id" IS NULL;

ALTER TABLE "drug_category_specialization_mapping" ALTER COLUMN "specialization_id" SET NOT NULL;

DROP INDEX IF EXISTS "unique_mapping_category_spec";

ALTER TABLE "drug_category_specialization_mapping" DROP COLUMN "specialization";

ALTER TABLE "drug_category_specialization_mapping" ADD CONSTRAINT "drug_category_specialization_mapping_specialization_id_specializations_id_fk"
  FOREIGN KEY ("specialization_id") REFERENCES "public"."specializations"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_mapping_category_spec"
  ON "drug_category_specialization_mapping" ("drug_category_id","specialization_id");

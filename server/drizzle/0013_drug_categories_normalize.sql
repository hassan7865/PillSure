-- Normalize drug categories: master table + FK on medicines and mapping

CREATE TABLE IF NOT EXISTS "drug_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	CONSTRAINT "drug_categories_name_unique" UNIQUE("name")
);

INSERT INTO "drug_categories" ("name")
SELECT DISTINCT TRIM("drug_category")
FROM "medicines"
WHERE "drug_category" IS NOT NULL AND TRIM("drug_category") <> ''
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "drug_categories" ("name")
SELECT DISTINCT TRIM("drug_category")
FROM "drug_category_specialization_mapping"
WHERE TRIM("drug_category") <> ''
ON CONFLICT ("name") DO NOTHING;

ALTER TABLE "medicines" ADD COLUMN "drug_category_id" integer;

UPDATE "medicines" m
SET "drug_category_id" = dc."id"
FROM "drug_categories" dc
WHERE m."drug_category" IS NOT NULL AND TRIM(m."drug_category") = dc."name";

ALTER TABLE "medicines" ADD CONSTRAINT "medicines_drug_category_id_drug_categories_id_fk"
  FOREIGN KEY ("drug_category_id") REFERENCES "public"."drug_categories"("id") ON DELETE set null ON UPDATE no action;

DROP INDEX IF EXISTS "idx_medicines_drug_category";
ALTER TABLE "medicines" DROP COLUMN "drug_category";
CREATE INDEX IF NOT EXISTS "idx_medicines_drug_category_id" ON "medicines" ("drug_category_id");

-- Postgres may expose this as a constraint-backed unique; drop constraint first, then index if any.
ALTER TABLE "drug_category_specialization_mapping" DROP CONSTRAINT IF EXISTS "unique_mapping";
DROP INDEX IF EXISTS "unique_mapping";

ALTER TABLE "drug_category_specialization_mapping" ADD COLUMN "drug_category_id" integer;

UPDATE "drug_category_specialization_mapping" m
SET "drug_category_id" = dc."id"
FROM "drug_categories" dc
WHERE TRIM(m."drug_category") = dc."name";

DELETE FROM "drug_category_specialization_mapping" WHERE "drug_category_id" IS NULL;

ALTER TABLE "drug_category_specialization_mapping" ALTER COLUMN "drug_category_id" SET NOT NULL;

ALTER TABLE "drug_category_specialization_mapping" DROP COLUMN "drug_category";

ALTER TABLE "drug_category_specialization_mapping" ADD CONSTRAINT "drug_category_specialization_mapping_drug_category_id_drug_categories_id_fk"
  FOREIGN KEY ("drug_category_id") REFERENCES "public"."drug_categories"("id") ON DELETE cascade ON UPDATE no action;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_mapping_category_spec"
  ON "drug_category_specialization_mapping" ("drug_category_id","specialization");

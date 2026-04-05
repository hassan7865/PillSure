DROP INDEX IF EXISTS "idx_medicines_drug_category_id";
--> statement-breakpoint
ALTER TABLE "medicines" DROP CONSTRAINT IF EXISTS "medicines_drug_category_id_drug_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "drug_category_id";

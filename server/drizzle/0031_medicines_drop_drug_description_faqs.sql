DROP INDEX IF EXISTS "idx_medicines_faqs";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_medicines_drug_description";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "drug_description";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "faqs";

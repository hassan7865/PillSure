-- Listing-specific clinical copy (moved from global `medicines`).
ALTER TABLE "medical_store_medicines" ADD COLUMN IF NOT EXISTS "drug_description" text;
--> statement-breakpoint
ALTER TABLE "medical_store_medicines" ADD COLUMN IF NOT EXISTS "faqs" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_drug_description" ON "medical_store_medicines" ("drug_description");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_faqs" ON "medical_store_medicines" USING gin ("faqs");
--> statement-breakpoint
UPDATE "medical_store_medicines" AS msm
SET
  "drug_description" = m."drug_description",
  "faqs" = m."faqs"
FROM "medicines" AS m
WHERE msm."medicine_id" = m."id";

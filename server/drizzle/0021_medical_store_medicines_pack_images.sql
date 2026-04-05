ALTER TABLE "medical_store_medicines" ADD COLUMN IF NOT EXISTS "pack_images" jsonb;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_pack_images" ON "medical_store_medicines" USING gin ("pack_images");

ALTER TABLE "manufacturer_medicines" ADD COLUMN IF NOT EXISTS "listed_quantity" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "manufacturer_medicines" SET "listed_quantity" = 0 WHERE "listed_quantity" IS NULL;

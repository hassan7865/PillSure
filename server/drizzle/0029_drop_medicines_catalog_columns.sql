-- Master catalog: name + clinical copy only; pricing/stock/images live on listings (e.g. medical_store_medicines).
DROP INDEX IF EXISTS "idx_medicines_images";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_medicines_price";
--> statement-breakpoint
DROP INDEX IF EXISTS "idx_medicines_stock";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "medicine_url";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "price";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "discount";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "stock";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "images";
--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "drug_varient";

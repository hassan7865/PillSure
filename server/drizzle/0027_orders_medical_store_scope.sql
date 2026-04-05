-- Retail orders belong to a medical store; cart/order lines reference pharmacy listings when purchased from marketplace.

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "medical_store_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_medical_store_id_medical_stores_id_fk" FOREIGN KEY ("medical_store_id") REFERENCES "public"."medical_stores"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_medical_store_id" ON "orders" ("medical_store_id");
--> statement-breakpoint

ALTER TABLE "cart_items" ADD COLUMN IF NOT EXISTS "medical_store_medicine_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_medical_store_medicine_id_medical_store_medicines_id_fk" FOREIGN KEY ("medical_store_medicine_id") REFERENCES "public"."medical_store_medicines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_medical_store_medicine_id" ON "cart_items" ("medical_store_medicine_id");
--> statement-breakpoint

DROP INDEX IF EXISTS "uq_cart_items_cart_medicine_appointment";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cart_items_store_listing" ON "cart_items" ("cart_id", "medical_store_medicine_id") WHERE "medical_store_medicine_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cart_items_legacy_rx" ON "cart_items" ("cart_id", "medicine_id", "appointment_id") WHERE "medical_store_medicine_id" IS NULL AND "appointment_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cart_items_legacy_direct" ON "cart_items" ("cart_id", "medicine_id") WHERE "medical_store_medicine_id" IS NULL AND "appointment_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "medical_store_medicine_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_medical_store_medicine_id_medical_store_medicines_id_fk" FOREIGN KEY ("medical_store_medicine_id") REFERENCES "public"."medical_store_medicines"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_medical_store_medicine_id" ON "order_items" ("medical_store_medicine_id");

CREATE TABLE IF NOT EXISTS "manufacturer_wholesale_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_store_id" uuid NOT NULL,
	"manufacturer_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR' NOT NULL,
	"subtotal" numeric(14, 2) NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manufacturer_wholesale_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"manufacturer_medicine_id" uuid NOT NULL,
	"medicine_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"moq_snapshot" integer NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"line_total" numeric(14, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_wholesale_orders" ADD CONSTRAINT "manufacturer_wholesale_orders_medical_store_id_medical_stores_id_fk" FOREIGN KEY ("medical_store_id") REFERENCES "public"."medical_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_wholesale_orders" ADD CONSTRAINT "manufacturer_wholesale_orders_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_wholesale_order_items" ADD CONSTRAINT "manufacturer_wholesale_order_items_order_id_manufacturer_wholesale_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."manufacturer_wholesale_orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_wholesale_order_items" ADD CONSTRAINT "manufacturer_wholesale_order_items_manufacturer_medicine_id_manufacturer_medicines_id_fk" FOREIGN KEY ("manufacturer_medicine_id") REFERENCES "public"."manufacturer_medicines"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_wholesale_order_items" ADD CONSTRAINT "manufacturer_wholesale_order_items_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_mfr_wholesale_order_items_order_listing" ON "manufacturer_wholesale_order_items" USING btree ("order_id","manufacturer_medicine_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mfr_wholesale_order_items_order_id" ON "manufacturer_wholesale_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mfr_wholesale_orders_mfr_created" ON "manufacturer_wholesale_orders" USING btree ("manufacturer_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mfr_wholesale_orders_store_created" ON "manufacturer_wholesale_orders" USING btree ("medical_store_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mfr_wholesale_orders_status" ON "manufacturer_wholesale_orders" USING btree ("status");

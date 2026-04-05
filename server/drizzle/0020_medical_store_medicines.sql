CREATE TABLE IF NOT EXISTS "medical_store_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_store_id" uuid NOT NULL,
	"medicine_id" integer NOT NULL,
	"manufacturer_medicine_id" uuid,
	"retail_price" numeric(12, 2) NOT NULL,
	"listed_quantity" integer DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_medicines" ADD CONSTRAINT "medical_store_medicines_medical_store_id_medical_stores_id_fk" FOREIGN KEY ("medical_store_id") REFERENCES "public"."medical_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_medicines" ADD CONSTRAINT "medical_store_medicines_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_medicines" ADD CONSTRAINT "medical_store_medicines_manufacturer_medicine_id_manufacturer_medicines_id_fk" FOREIGN KEY ("manufacturer_medicine_id") REFERENCES "public"."manufacturer_medicines"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_medical_store_medicines_store_medicine" ON "medical_store_medicines" ("medical_store_id","medicine_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_medical_store_id" ON "medical_store_medicines" ("medical_store_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_medicine_id" ON "medical_store_medicines" ("medicine_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_medicines_manufacturer_medicine_id" ON "medical_store_medicines" ("manufacturer_medicine_id");

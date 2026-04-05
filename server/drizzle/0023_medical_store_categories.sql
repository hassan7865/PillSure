CREATE TABLE IF NOT EXISTS "medical_store_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medical_store_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_categories" ADD CONSTRAINT "medical_store_categories_medical_store_id_medical_stores_id_fk" FOREIGN KEY ("medical_store_id") REFERENCES "public"."medical_stores"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_medical_store_categories_store_name" ON "medical_store_categories" ("medical_store_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_store_categories_medical_store_id" ON "medical_store_categories" ("medical_store_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_store_medicine_categories" (
	"medical_store_medicine_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "medical_store_medicine_categories_medical_store_medicine_id_category_id_pk" PRIMARY KEY("medical_store_medicine_id","category_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_medicine_categories" ADD CONSTRAINT "medical_store_medicine_categories_medical_store_medicine_id_medical_store_medicines_id_fk" FOREIGN KEY ("medical_store_medicine_id") REFERENCES "public"."medical_store_medicines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_store_medicine_categories" ADD CONSTRAINT "medical_store_medicine_categories_category_id_medical_store_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."medical_store_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

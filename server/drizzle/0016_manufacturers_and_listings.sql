-- Ensure medicines.id can be referenced by FK (legacy DBs may lack a primary key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'medicines'
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE public.medicines ADD CONSTRAINT medicines_pkey PRIMARY KEY (id);
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manufacturers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"legal_name" varchar(500) NOT NULL,
	"short_name" varchar(200),
	"address_line" text NOT NULL,
	"city" varchar(120) NOT NULL,
	"province" varchar(120),
	"postal_code" varchar(20),
	"country" varchar(120) DEFAULT 'Pakistan' NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"license_number" varchar(120),
	"website" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_city" ON "manufacturers" ("city");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_legal_name" ON "manufacturers" ("legal_name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "manufacturer_medicines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manufacturer_id" uuid NOT NULL,
	"medicine_id" integer NOT NULL,
	"wholesale_price" numeric(12, 2) NOT NULL,
	"moq" integer DEFAULT 1 NOT NULL,
	"currency" varchar(10) DEFAULT 'PKR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_medicines" ADD CONSTRAINT "manufacturer_medicines_manufacturer_id_manufacturers_id_fk" FOREIGN KEY ("manufacturer_id") REFERENCES "public"."manufacturers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturer_medicines" ADD CONSTRAINT "manufacturer_medicines_medicine_id_medicines_id_fk" FOREIGN KEY ("medicine_id") REFERENCES "public"."medicines"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_manufacturer_medicines_mfr_medicine" ON "manufacturer_medicines" ("manufacturer_id","medicine_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturer_medicines_medicine_id" ON "manufacturer_medicines" ("medicine_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturer_medicines_manufacturer_id" ON "manufacturer_medicines" ("manufacturer_id");

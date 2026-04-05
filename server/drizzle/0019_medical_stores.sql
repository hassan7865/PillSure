INSERT INTO "roles" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'medical_store', 'Medical store / pharmacy', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'medical_store');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"store_name" varchar(500) NOT NULL,
	"address_line" text NOT NULL,
	"city" varchar(120) NOT NULL,
	"province" varchar(120),
	"postal_code" varchar(20),
	"country" varchar(120) DEFAULT 'Pakistan' NOT NULL,
	"phone" varchar(50),
	"email" varchar(255),
	"license_number" varchar(120),
	"website" text,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_stores" ADD CONSTRAINT "medical_stores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_medical_stores_user_id" ON "medical_stores" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_stores_user_id" ON "medical_stores" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medical_stores_lat_lng" ON "medical_stores" ("latitude", "longitude");

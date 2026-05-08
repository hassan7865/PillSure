CREATE TABLE IF NOT EXISTS "doctor_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"practice_affiliation_id" uuid NOT NULL,
	"service_name" varchar(255) NOT NULL,
	"description" text,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"price_pkr" numeric(10, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_services" ADD CONSTRAINT "doctor_services_practice_affiliation_id_doctor_practice_affiliations_id_fk" FOREIGN KEY ("practice_affiliation_id") REFERENCES "public"."doctor_practice_affiliations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_services_doctor_affiliation" ON "doctor_services" ("doctor_id","practice_affiliation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_services_affiliation" ON "doctor_services" ("practice_affiliation_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_doctor_services_active_name_per_scope" ON "doctor_services" ("doctor_id","practice_affiliation_id","service_name") WHERE "is_active" = true;
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "doctor_service_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_service_id_doctor_services_id_fk" FOREIGN KEY ("doctor_service_id") REFERENCES "public"."doctor_services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_doctor_service_id" ON "appointments" ("doctor_service_id");


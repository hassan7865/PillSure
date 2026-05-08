CREATE TABLE IF NOT EXISTS "doctor_practice_affiliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"hospital_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"invitation_source" varchar(30),
	"weekly_schedule" jsonb,
	"fee_pkr_override" numeric(10, 2),
	"suspended_reason" text,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_practice_affiliations" ADD CONSTRAINT "doctor_practice_affiliations_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_practice_affiliations" ADD CONSTRAINT "doctor_practice_affiliations_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_practice_affiliations_doctor" ON "doctor_practice_affiliations" ("doctor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_practice_affiliations_hospital" ON "doctor_practice_affiliations" ("hospital_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_practice_affiliations_invitation_source" ON "doctor_practice_affiliations" ("invitation_source");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_practice_affiliations_status" ON "doctor_practice_affiliations" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_dpa_doctor_hospital_active" ON "doctor_practice_affiliations" ("doctor_id", "hospital_id") WHERE "status" = 'active' AND "kind" = 'hospital' AND "hospital_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_dpa_doctor_private_active" ON "doctor_practice_affiliations" ("doctor_id") WHERE "status" = 'active' AND "kind" = 'private';
--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "practice_affiliation_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practice_affiliation_id_doctor_practice_affiliations_id_fk" FOREIGN KEY ("practice_affiliation_id") REFERENCES "public"."doctor_practice_affiliations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_practice_affiliation_id" ON "appointments" ("practice_affiliation_id");
--> statement-breakpoint
ALTER TABLE "whatsapp_business_accounts" ADD COLUMN IF NOT EXISTS "default_practice_affiliation_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_default_practice_affiliation_id_doctor_practice_affiliations_id_fk" FOREIGN KEY ("default_practice_affiliation_id") REFERENCES "public"."doctor_practice_affiliations"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "doctor_availability_exceptions" ADD COLUMN IF NOT EXISTS "practice_affiliation_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_availability_exceptions" ADD CONSTRAINT "doctor_availability_exceptions_practice_affiliation_id_doctor_practice_affiliations_id_fk" FOREIGN KEY ("practice_affiliation_id") REFERENCES "public"."doctor_practice_affiliations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
INSERT INTO "doctor_practice_affiliations" ("doctor_id", "kind", "hospital_id", "status", "weekly_schedule", "created_at", "updated_at")
SELECT d."id",
	'hospital',
	d."hospitalId",
	'active',
	jsonb_strip_nulls(jsonb_build_object(
		'availableDays', COALESCE(d."available_days", '[]'::jsonb),
		'openingTime', d."opening_time",
		'closingTime', d."closing_time"
	)),
	now(),
	now()
FROM "doctors" d
WHERE d."hospitalId" IS NOT NULL
AND NOT EXISTS (
	SELECT 1 FROM "doctor_practice_affiliations" a
	WHERE a."doctor_id" = d."id"
	AND a."kind" = 'hospital'
	AND a."hospital_id" = d."hospitalId"
	AND a."status" = 'active'
);

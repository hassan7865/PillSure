CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"appointment_date" date NOT NULL,
	"appointment_time" varchar(10) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"consultation_mode" varchar(20) NOT NULL,
	"patient_notes" text,
	"doctor_notes" text,
	"prescription" text,
	"diagnosis" text,
	"cancellation_reason" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"gender" varchar(20) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"specializationIds" jsonb NOT NULL,
	"qualifications" jsonb NOT NULL,
	"experience_years" integer NOT NULL,
	"patientSatisfactionRate" numeric(5, 2) NOT NULL,
	"hospitalId" uuid,
	"address" text NOT NULL,
	"image" text,
	"fee_pkr" numeric(10, 2),
	"consultationModes" jsonb,
	"opening_time" varchar(10),
	"closing_time" varchar(10),
	"available_days" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hospitals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"hospitalName" varchar(255) NOT NULL,
	"hospitalAddress" text NOT NULL,
	"hospitalContactNo" varchar(20) NOT NULL,
	"hospitalEmail" varchar(255) NOT NULL,
	"websiteHospital" varchar(255),
	"licenseNo" varchar(100) NOT NULL,
	"adminName" varchar(255) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255),
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"roleId" uuid NOT NULL,
	"isgoogle" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"isEmailVerified" boolean DEFAULT false NOT NULL,
	"onboardingStep" integer DEFAULT 0 NOT NULL,
	"isOnboardingComplete" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "specializations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medicines" (
	"id" serial PRIMARY KEY NOT NULL,
	"medicine_name" varchar(500) NOT NULL,
	"medicine_url" text,
	"price" numeric(10, 2),
	"discount" numeric(5, 2),
	"stock" integer,
	"images" jsonb,
	"prescription_required" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"drug_description" text,
	"drug_category" text,
	"drug_varient" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"gender" varchar(20) NOT NULL,
	"mobile" varchar(20) NOT NULL,
	"dateOfBirth" date NOT NULL,
	"address" text NOT NULL,
	"bloodGroup" varchar(10) NOT NULL,
	"hasCovid" boolean DEFAULT false NOT NULL,
	"pastMedicalHistory" jsonb,
	"surgicalHistory" text,
	"allergies" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctors" ADD CONSTRAINT "doctors_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctors" ADD CONSTRAINT "doctors_hospitalId_hospitals_id_fk" FOREIGN KEY ("hospitalId") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hospitals" ADD CONSTRAINT "hospitals_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_roleId_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "patients" ADD CONSTRAINT "patients_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_patient_id" ON "appointments" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_doctor_id" ON "appointments" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_date" ON "appointments" USING btree ("appointment_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_status" ON "appointments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appointments_created_at" ON "appointments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_doctors_experience" ON "doctors" USING btree ("experience_years");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_doctors_hospitalId" ON "doctors" USING btree ("hospitalId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_doctors_satisfaction" ON "doctors" USING btree ("patientSatisfactionRate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_doctors_specializationIds" ON "doctors" USING btree ("specializationIds");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_doctors_userId" ON "doctors" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UQ_specialization_name" ON "specializations" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_drug_category" ON "medicines" USING btree ("drug_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_drug_description" ON "medicines" USING gin (to_tsvector('english', "drug_description"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_images" ON "medicines" USING gin ("images");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_name" ON "medicines" USING btree ("medicine_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_prescription" ON "medicines" USING btree ("prescription_required");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_price" ON "medicines" USING btree ("price");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_stock" ON "medicines" USING btree ("stock");
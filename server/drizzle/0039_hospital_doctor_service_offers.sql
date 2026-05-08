CREATE TABLE IF NOT EXISTS "hospital_doctor_service_offers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hospital_id" uuid NOT NULL,
  "doctor_id" uuid NOT NULL,
  "practice_affiliation_id" uuid NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "services" jsonb NOT NULL,
  "conflicts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "status" varchar(32) DEFAULT 'ready_to_accept' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "doctor_reviewed_at" timestamp,
  "doctor_decision" varchar(16),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "hospital_doctor_service_offers_hospital_id_fk"
    FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE,
  CONSTRAINT "hospital_doctor_service_offers_doctor_id_fk"
    FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE,
  CONSTRAINT "hospital_doctor_service_offers_practice_affiliation_id_fk"
    FOREIGN KEY ("practice_affiliation_id") REFERENCES "doctor_practice_affiliations"("id") ON DELETE CASCADE,
  CONSTRAINT "hospital_doctor_service_offers_created_by_user_id_fk"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_hospital_doctor_service_offers_hospital"
  ON "hospital_doctor_service_offers" ("hospital_id");
CREATE INDEX IF NOT EXISTS "idx_hospital_doctor_service_offers_doctor"
  ON "hospital_doctor_service_offers" ("doctor_id");
CREATE INDEX IF NOT EXISTS "idx_hospital_doctor_service_offers_affiliation"
  ON "hospital_doctor_service_offers" ("practice_affiliation_id");
CREATE INDEX IF NOT EXISTS "idx_hospital_doctor_service_offers_status"
  ON "hospital_doctor_service_offers" ("status");


CREATE TABLE IF NOT EXISTS "hospital_service_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "hospital_id" uuid NOT NULL,
  "service_name" varchar(255) NOT NULL,
  "description" text,
  "rate" numeric(10, 2) NOT NULL,
  "currency" varchar(10) DEFAULT 'PKR' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "hospital_service_catalog_hospital_id_fk"
    FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE,
  CONSTRAINT "hospital_service_catalog_currency_pkr_only"
    CHECK ("currency" = 'PKR')
);

CREATE INDEX IF NOT EXISTS "idx_hospital_service_catalog_hospital"
  ON "hospital_service_catalog" ("hospital_id");
CREATE INDEX IF NOT EXISTS "idx_hospital_service_catalog_hospital_active"
  ON "hospital_service_catalog" ("hospital_id", "is_active");

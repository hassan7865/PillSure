ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "duration_minutes" integer DEFAULT 30 NOT NULL;

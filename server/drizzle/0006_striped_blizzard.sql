-- Convert existing text columns to jsonb safely by initializing to empty arrays.
-- We don't try to auto-convert old free-text data into structured JSON;
-- existing values will become []::jsonb.
ALTER TABLE "appointments"
  ALTER COLUMN "prescription"
  SET DATA TYPE jsonb
  USING '[]'::jsonb;--> statement-breakpoint

ALTER TABLE "appointments"
  ALTER COLUMN "diagnosis"
  SET DATA TYPE jsonb
  USING '[]'::jsonb;
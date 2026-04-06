ALTER TABLE "medical_stores"
ADD COLUMN IF NOT EXISTS "opening_time" varchar(10),
ADD COLUMN IF NOT EXISTS "closing_time" varchar(10);

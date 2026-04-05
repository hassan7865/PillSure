-- Store branding for marketplace / pharmacy pages
ALTER TABLE "medical_stores" ADD COLUMN IF NOT EXISTS "logo_url" text;

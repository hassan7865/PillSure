DROP INDEX IF EXISTS "idx_medicines_description";--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='medicines' AND column_name='drug_description') THEN
        ALTER TABLE "medicines" ADD COLUMN "drug_description" text;
    END IF;
END $$;--> statement-breakpoint
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='medicines' AND column_name='faqs') THEN
        ALTER TABLE "medicines" ADD COLUMN "faqs" jsonb;
    END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_drug_description" ON "medicines" USING btree ("drug_description");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_medicines_faqs" ON "medicines" USING gin ("faqs");--> statement-breakpoint
ALTER TABLE "medicines" DROP COLUMN IF EXISTS "description";
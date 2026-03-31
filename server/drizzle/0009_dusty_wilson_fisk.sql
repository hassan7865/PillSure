ALTER TABLE "appointments" ADD COLUMN "payment_provider" varchar(20);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "payment_status" varchar(20) DEFAULT 'unpaid' NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "stripe_session_id" varchar(255);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "amount_paid" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "currency" varchar(10);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_appointments_stripe_session_id" ON "appointments" USING btree ("stripe_session_id");
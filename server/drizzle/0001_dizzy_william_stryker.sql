CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"doctorId" uuid NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_doctorId_doctors_id_fk" FOREIGN KEY ("doctorId") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_userId" ON "reviews" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_doctorId" ON "reviews" USING btree ("doctorId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_rating" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reviews_createdAt" ON "reviews" USING btree ("createdAt");
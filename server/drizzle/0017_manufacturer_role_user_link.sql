INSERT INTO "roles" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid(), 'manufacturer', 'Pharmaceutical manufacturer', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'manufacturer');
--> statement-breakpoint
ALTER TABLE "manufacturers" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "manufacturers" ADD CONSTRAINT "manufacturers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_manufacturers_user_id" ON "manufacturers" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_manufacturers_user_id" ON "manufacturers" ("user_id");

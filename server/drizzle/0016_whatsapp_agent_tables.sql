CREATE TABLE IF NOT EXISTS "whatsapp_business_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"hospital_id" uuid,
	"doctor_id" uuid,
	"allowed_doctor_ids" jsonb,
	"phone_number_id" varchar(64) NOT NULL,
	"display_phone_number" varchar(32),
	"access_token" text NOT NULL,
	"whatsapp_app_id" varchar(64) NOT NULL,
	"waba_id" varchar(64),
	"is_setup_complete" boolean DEFAULT false NOT NULL,
	"total_messages_sent" integer DEFAULT 0 NOT NULL,
	"total_messages_received" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_message_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"whatsapp_account_id" uuid,
	"owner_user_id" uuid NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"direction" varchar(32) NOT NULL,
	"body" text,
	"phone_number_id" varchar(64),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "whatsapp_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"customer_phone" varchar(32) NOT NULL,
	"messages_history" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chatbot_personas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"business_type" varchar(128) DEFAULT 'healthcare' NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"persona" text NOT NULL,
	"business_info" jsonb,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"whatsapp_number" varchar(32),
	"logo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "doctor_availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" uuid NOT NULL,
	"exception_date" date NOT NULL,
	"start_time" varchar(10),
	"end_time" varchar(10),
	"is_full_day" boolean DEFAULT true NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_hospital_id_hospitals_id_fk" FOREIGN KEY ("hospital_id") REFERENCES "public"."hospitals"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_business_accounts" ADD CONSTRAINT "whatsapp_business_accounts_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_message_history" ADD CONSTRAINT "whatsapp_message_history_whatsapp_account_id_whatsapp_business_accounts_id_fk" FOREIGN KEY ("whatsapp_account_id") REFERENCES "public"."whatsapp_business_accounts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_message_history" ADD CONSTRAINT "whatsapp_message_history_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chatbot_personas" ADD CONSTRAINT "chatbot_personas_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "doctor_availability_exceptions" ADD CONSTRAINT "doctor_availability_exceptions_doctor_id_doctors_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_business_accounts_phone_number_id" ON "whatsapp_business_accounts" USING btree ("phone_number_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_business_accounts_owner" ON "whatsapp_business_accounts" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_message_history_owner_phone" ON "whatsapp_message_history" USING btree ("owner_user_id","customer_phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_whatsapp_conversations_owner_customer" ON "whatsapp_conversations" USING btree ("owner_user_id","customer_phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_whatsapp_conversations_owner" ON "whatsapp_conversations" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_chatbot_personas_owner_active" ON "chatbot_personas" USING btree ("owner_user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_doctor_availability_exceptions_doctor_date" ON "doctor_availability_exceptions" USING btree ("doctor_id","exception_date");

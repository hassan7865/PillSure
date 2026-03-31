CREATE TABLE IF NOT EXISTS "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"medicine_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"source_type" varchar(20) DEFAULT 'direct' NOT NULL,
	"appointment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" varchar(30) DEFAULT 'placed' NOT NULL,
	"payment_method" varchar(20) NOT NULL,
	"payment_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"stripe_session_id" varchar(255),
	"subtotal" numeric(12, 2) NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"currency" varchar(10) DEFAULT 'pkr' NOT NULL,
	"shipping_address" text,
	"contact_no" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"medicine_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"appointment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "carts" ADD CONSTRAINT "carts_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_patient_id_users_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "order_items" ADD CONSTRAINT "order_items_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_cart_items_cart_medicine_appointment" ON "cart_items" USING btree ("cart_id","medicine_id","appointment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_cart_id" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cart_items_medicine_id" ON "cart_items" USING btree ("medicine_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_carts_patient_id" ON "carts" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_carts_is_active" ON "carts" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_orders_stripe_session_id" ON "orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_patient_id" ON "orders" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_order_items_medicine_id" ON "order_items" USING btree ("medicine_id");
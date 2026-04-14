ALTER TABLE "manufacturer_wholesale_orders"
ADD COLUMN "payment_method" varchar(30) DEFAULT 'offline_terms' NOT NULL;

ALTER TABLE "manufacturer_wholesale_orders"
ADD COLUMN "payment_status" varchar(30) DEFAULT 'pending' NOT NULL;

ALTER TABLE "manufacturer_wholesale_orders"
ADD COLUMN "payment_provider" varchar(20);

ALTER TABLE "manufacturer_wholesale_orders"
ADD COLUMN "gateway_session_id" varchar(255);

ALTER TABLE "manufacturer_wholesale_orders"
ADD COLUMN "paid_at" timestamp;

CREATE INDEX IF NOT EXISTS "idx_mfr_wholesale_orders_payment_status"
ON "manufacturer_wholesale_orders" USING btree ("payment_status");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_mfr_wholesale_orders_gateway_session_id"
ON "manufacturer_wholesale_orders" USING btree ("gateway_session_id");

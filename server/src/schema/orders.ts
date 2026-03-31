import { pgTable, uuid, varchar, numeric, timestamp, text, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("placed"),
    paymentMethod: varchar("payment_method", { length: 20 }).notNull(),
    paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("pending"),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("pkr"),
    shippingAddress: text("shipping_address"),
    contactNo: varchar("contact_no", { length: 30 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqOrdersStripeSessionId: uniqueIndex("uq_orders_stripe_session_id").on(table.stripeSessionId),
    idxOrdersPatientId: index("idx_orders_patient_id").on(table.patientId),
    idxOrdersStatus: index("idx_orders_status").on(table.status),
  })
);

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { medicalStores } from "./medicalStores";
import { manufacturers } from "./manufacturers";

export const manufacturerWholesaleOrders = pgTable(
  "manufacturer_wholesale_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    medicalStoreId: uuid("medical_store_id")
      .notNull()
      .references(() => medicalStores.id, { onDelete: "cascade" }),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 30 }).notNull().default("pending"),
    paymentMethod: varchar("payment_method", { length: 30 }).notNull().default("offline_terms"),
    paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("pending"),
    paymentProvider: varchar("payment_provider", { length: 20 }),
    gatewaySessionId: varchar("gateway_session_id", { length: 255 }),
    paidAt: timestamp("paid_at", { withTimezone: false }),
    currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull(),
    total: numeric("total", { precision: 14, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    idxMfrCreated: index("idx_mfr_wholesale_orders_mfr_created").on(
      table.manufacturerId,
      table.createdAt,
    ),
    idxStoreCreated: index("idx_mfr_wholesale_orders_store_created").on(
      table.medicalStoreId,
      table.createdAt,
    ),
    idxStatus: index("idx_mfr_wholesale_orders_status").on(table.status),
    idxPaymentStatus: index("idx_mfr_wholesale_orders_payment_status").on(table.paymentStatus),
    uqGatewaySessionId: uniqueIndex("uq_mfr_wholesale_orders_gateway_session_id").on(table.gatewaySessionId),
  }),
);

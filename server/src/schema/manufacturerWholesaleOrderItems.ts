import {
  pgTable,
  uuid,
  integer,
  numeric,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { manufacturerWholesaleOrders } from "./manufacturerWholesaleOrders";
import { manufacturerMedicines } from "./manufacturerMedicines";
import { medicines } from "./medicine";

export const manufacturerWholesaleOrderItems = pgTable(
  "manufacturer_wholesale_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => manufacturerWholesaleOrders.id, { onDelete: "cascade" }),
    manufacturerMedicineId: uuid("manufacturer_medicine_id")
      .notNull()
      .references(() => manufacturerMedicines.id, { onDelete: "restrict" }),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "restrict" }),
    quantity: integer("quantity").notNull(),
    moqSnapshot: integer("moq_snapshot").notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    uqOrderListing: uniqueIndex("uq_mfr_wholesale_order_items_order_listing").on(
      table.orderId,
      table.manufacturerMedicineId,
    ),
    idxOrderId: index("idx_mfr_wholesale_order_items_order_id").on(table.orderId),
  }),
);

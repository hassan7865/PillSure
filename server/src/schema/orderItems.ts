import { pgTable, uuid, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { orders } from "./orders";
import { appointments } from "./appointments";

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id").notNull(),
    quantity: integer("quantity").notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idxOrderItemsOrderId: index("idx_order_items_order_id").on(table.orderId),
    idxOrderItemsMedicineId: index("idx_order_items_medicine_id").on(table.medicineId),
  })
);

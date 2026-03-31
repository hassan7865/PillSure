import { pgTable, uuid, integer, numeric, timestamp, varchar, uniqueIndex, index } from "drizzle-orm/pg-core";
import { carts } from "./carts";
import { appointments } from "./appointments";

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id").notNull(),
    quantity: integer("quantity").notNull().default(1),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    sourceType: varchar("source_type", { length: 20 }).notNull().default("direct"),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqCartItem: uniqueIndex("uq_cart_items_cart_medicine_appointment").on(
      table.cartId,
      table.medicineId,
      table.appointmentId
    ),
    idxCartItemsCartId: index("idx_cart_items_cart_id").on(table.cartId),
    idxCartItemsMedicineId: index("idx_cart_items_medicine_id").on(table.medicineId),
  })
);

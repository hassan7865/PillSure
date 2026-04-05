import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { manufacturers } from "./manufacturers";
import { medicines } from "./medicine";

export const manufacturerMedicines = pgTable(
  "manufacturer_medicines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    manufacturerId: uuid("manufacturer_id")
      .notNull()
      .references(() => manufacturers.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    wholesalePrice: numeric("wholesale_price", { precision: 12, scale: 2 }).notNull(),
    listedQuantity: integer("listed_quantity").notNull().default(0),
    moq: integer("moq").notNull().default(1),
    currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    uqManufacturerMedicine: uniqueIndex("uq_manufacturer_medicines_mfr_medicine").on(
      table.manufacturerId,
      table.medicineId
    ),
    idxMedicineId: index("idx_manufacturer_medicines_medicine_id").on(table.medicineId),
    idxManufacturerId: index("idx_manufacturer_medicines_manufacturer_id").on(table.manufacturerId),
  })
);

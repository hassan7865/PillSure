import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { medicalStores } from "./medicalStores";

export const medicalStoreCategories = pgTable(
  "medical_store_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    medicalStoreId: uuid("medical_store_id")
      .notNull()
      .references(() => medicalStores.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 500 }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    uqStoreName: uniqueIndex("uq_medical_store_categories_store_name").on(
      table.medicalStoreId,
      table.name,
    ),
    idxStoreId: index("idx_medical_store_categories_medical_store_id").on(table.medicalStoreId),
  }),
);

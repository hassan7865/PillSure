import { pgTable, uuid, primaryKey } from "drizzle-orm/pg-core";
import { medicalStoreCategories } from "./medicalStoreCategories";
import { medicalStoreMedicines } from "./medicalStoreMedicines";

export const medicalStoreMedicineCategories = pgTable(
  "medical_store_medicine_categories",
  {
    medicalStoreMedicineId: uuid("medical_store_medicine_id")
      .notNull()
      .references(() => medicalStoreMedicines.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => medicalStoreCategories.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.medicalStoreMedicineId, table.categoryId] }),
  }),
);

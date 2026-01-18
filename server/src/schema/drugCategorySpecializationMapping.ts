import { pgTable, serial, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const drugCategorySpecializationMapping = pgTable(
  "drug_category_specialization_mapping",
  {
    id: serial("id").primaryKey(),
    drugCategory: varchar("drug_category", { length: 100 }).notNull(),
    specialization: varchar("specialization", { length: 100 }).notNull(),
  },
  (table) => {
    return {
      uniqueMapping: uniqueIndex("unique_mapping").on(
        table.drugCategory,
        table.specialization
      ),
    };
  }
);

import { pgTable, serial, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const drugCategories = pgTable(
  "drug_categories",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("drug_categories_name_unique").on(table.name),
  })
);

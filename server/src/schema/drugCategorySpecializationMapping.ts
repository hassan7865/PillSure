import { pgTable, serial, integer, uniqueIndex } from "drizzle-orm/pg-core";
import { drugCategories } from "./drugCategories";
import { specializations } from "./specialization";

export const drugCategorySpecializationMapping = pgTable(
  "drug_category_specialization_mapping",
  {
    id: serial("id").primaryKey(),
    drugCategoryId: integer("drug_category_id")
      .notNull()
      .references(() => drugCategories.id, { onDelete: "cascade" }),
    specializationId: integer("specialization_id")
      .notNull()
      .references(() => specializations.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      uniqueMapping: uniqueIndex("unique_mapping_category_spec").on(
        table.drugCategoryId,
        table.specializationId
      ),
    };
  }
);

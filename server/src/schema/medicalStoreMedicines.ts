import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { medicalStores } from "./medicalStores";
import { medicines } from "./medicine";
import { manufacturerMedicines } from "./manufacturerMedicines";


export const medicalStoreMedicines = pgTable(
  "medical_store_medicines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    medicalStoreId: uuid("medical_store_id")
      .notNull()
      .references(() => medicalStores.id, { onDelete: "cascade" }),
    medicineId: integer("medicine_id")
      .notNull()
      .references(() => medicines.id, { onDelete: "cascade" }),
    /** When set, points at the manufacturer batch/listing this stock traceably came from. */
    manufacturerMedicineId: uuid("manufacturer_medicine_id").references(
      () => manufacturerMedicines.id,
      { onDelete: "set null" },
    ),
    packImages: jsonb("pack_images").$type<string[] | null>(),
    /** Listing-specific product description (was on global `medicines`). */
    drugDescription: text("drug_description"),
    /** Listing-specific FAQs as JSON array, e.g. [{ "question": "", "answer": "" }]. */
    faqs: jsonb("faqs").$type<Array<{ question: string; answer: string }> | null>(),
    retailPrice: numeric("retail_price", { precision: 12, scale: 2 }).notNull(),
    listedQuantity: integer("listed_quantity").notNull().default(0),
    currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    uqStoreMedicine: uniqueIndex("uq_medical_store_medicines_store_medicine").on(
      table.medicalStoreId,
      table.medicineId,
    ),
    idxMedicalStoreId: index("idx_medical_store_medicines_medical_store_id").on(table.medicalStoreId),
    idxMedicineId: index("idx_medical_store_medicines_medicine_id").on(table.medicineId),
    idxManufacturerMedicineId: index("idx_medical_store_medicines_manufacturer_medicine_id").on(
      table.manufacturerMedicineId,
    ),
    idxPackImages: index("idx_medical_store_medicines_pack_images").using("gin", table.packImages),
    idxDrugDescription: index("idx_medical_store_medicines_drug_description").on(table.drugDescription),
    idxFaqs: index("idx_medical_store_medicines_faqs").using("gin", table.faqs),
  }),
);

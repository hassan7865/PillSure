import { sql } from "drizzle-orm";
import {
    pgTable,
    serial,
    varchar,
    text,
    numeric,
    integer,
    jsonb,
    boolean,
    timestamp,
    index,
  } from "drizzle-orm/pg-core";
  
  export const medicines = pgTable(
    "medicines",
    {
      id: serial("id").primaryKey(),
      medicineName: varchar("medicine_name", { length: 500 }).notNull(),
      medicineUrl: text("medicine_url"),
      price: numeric("price", { precision: 10, scale: 2 }),
      discount: numeric("discount", { precision: 5, scale: 2 }),
      stock: integer("stock"),
      images: jsonb("images"),
      prescriptionRequired: boolean("prescription_required").default(false),
      createdAt: timestamp("created_at").defaultNow(),
      drugCategory: text("drug_category"),
      drugVarient: text("drug_varient"),
      drugDescription: text("drug_description"),
      faqs: jsonb("faqs"),
    },
    (table) => {
      return {
        idxDrugCategory: index("idx_medicines_drug_category").on(table.drugCategory),
        idxImages: index("idx_medicines_images").using("gin", table.images),
        idxDrugDescription: index("idx_medicines_drug_description").on(table.drugDescription),
        idxFaqs: index("idx_medicines_faqs").using("gin", table.faqs),
        idxName: index("idx_medicines_name").on(table.medicineName),
        idxPrescription: index("idx_medicines_prescription").on(table.prescriptionRequired),
        idxPrice: index("idx_medicines_price").on(table.price),
        idxStock: index("idx_medicines_stock").on(table.stock),
      };
    }
  );
  
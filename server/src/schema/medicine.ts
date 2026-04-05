import { pgTable, serial, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";

export const medicines = pgTable(
  "medicines",
  {
    id: serial("id").primaryKey(),
    medicineName: varchar("medicine_name", { length: 500 }).notNull(),
    prescriptionRequired: boolean("prescription_required").default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => {
    return {
      idxName: index("idx_medicines_name").on(table.medicineName),
      idxPrescription: index("idx_medicines_prescription").on(table.prescriptionRequired),
    };
  },
);

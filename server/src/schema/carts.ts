import { pgTable, uuid, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uqPatientCart: uniqueIndex("uq_carts_patient_id").on(table.patientId),
    idxCartsIsActive: index("idx_carts_is_active").on(table.isActive),
  })
);

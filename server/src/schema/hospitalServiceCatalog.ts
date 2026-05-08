import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { hospitals } from "./hospitals";

export const hospitalServiceCatalog = pgTable(
  "hospital_service_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 10 }).notNull().default("PKR"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxHospital: index("idx_hospital_service_catalog_hospital").on(table.hospitalId),
    idxHospitalActive: index("idx_hospital_service_catalog_hospital_active").on(table.hospitalId, table.isActive),
  }),
);

export type HospitalServiceCatalogRow = typeof hospitalServiceCatalog.$inferSelect;

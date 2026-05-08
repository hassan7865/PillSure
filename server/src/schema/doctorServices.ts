import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { doctors } from "./doctor";
import { doctorPracticeAffiliations } from "./doctorPracticeAffiliations";

export const doctorServices = pgTable(
  "doctor_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    practiceAffiliationId: uuid("practice_affiliation_id")
      .notNull()
      .references(() => doctorPracticeAffiliations.id, { onDelete: "cascade" }),
    serviceName: varchar("service_name", { length: 255 }).notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    pricePkr: numeric("price_pkr", { precision: 10, scale: 2 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxDoctorAffiliation: index("idx_doctor_services_doctor_affiliation").on(
      table.doctorId,
      table.practiceAffiliationId
    ),
    idxAffiliation: index("idx_doctor_services_affiliation").on(table.practiceAffiliationId),
    uqActiveServiceNamePerScope: uniqueIndex("uq_doctor_services_active_name_per_scope")
      .on(table.doctorId, table.practiceAffiliationId, table.serviceName)
      .where(sql`${table.isActive} = true`),
  })
);


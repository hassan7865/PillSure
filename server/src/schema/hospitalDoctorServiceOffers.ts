import { pgTable, uuid, varchar, jsonb, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { hospitals } from "./hospitals";
import { doctors } from "./doctor";
import { doctorPracticeAffiliations } from "./doctorPracticeAffiliations";

export type OfferSlot = {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  catalogServiceIds: string[];
};

export type OfferedCatalogService = {
  catalogServiceId: string;
  serviceName: string;
  description?: string;
  durationMinutes: number;
};

export type OfferService = {
  offeredServices: OfferedCatalogService[];
  offeredSlots: OfferSlot[];
};

export type OfferConflict = {
  code: "outside_doctor_base" | "overlap_other_affiliation";
  message: string;
  day: string;
  startTime: string;
  endTime: string;
  otherAffiliationId?: string;
};

export const hospitalDoctorServiceOffers = pgTable(
  "hospital_doctor_service_offers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    hospitalId: uuid("hospital_id")
      .notNull()
      .references(() => hospitals.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    practiceAffiliationId: uuid("practice_affiliation_id")
      .notNull()
      .references(() => doctorPracticeAffiliations.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    services: jsonb("services").$type<OfferService>().notNull(),
    conflicts: jsonb("conflicts").$type<OfferConflict[]>().notNull().default([]),
    status: varchar("status", { length: 32 }).notNull().default("ready_to_accept"),
    isActive: boolean("is_active").notNull().default(true),
    doctorReviewedAt: timestamp("doctor_reviewed_at", { withTimezone: false }),
    doctorDecision: varchar("doctor_decision", { length: 16 }),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxHospital: index("idx_hospital_doctor_service_offers_hospital").on(table.hospitalId),
    idxDoctor: index("idx_hospital_doctor_service_offers_doctor").on(table.doctorId),
    idxAffiliation: index("idx_hospital_doctor_service_offers_affiliation").on(table.practiceAffiliationId),
    idxStatus: index("idx_hospital_doctor_service_offers_status").on(table.status),
  }),
);


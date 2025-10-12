import {
    pgTable,
    uuid,
    varchar,
    jsonb,
    integer,
    numeric,
    text,
    boolean,
    timestamp,
    index,
  } from "drizzle-orm/pg-core";
  import { users } from "./users";
import { hospitals } from "./hospitals";

  
  export const doctors = pgTable(
    "doctors",
    {
      id: uuid("id").defaultRandom().primaryKey(),
      userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
      gender: varchar("gender", { length: 20 }).notNull(), // male, female, other
      mobile: varchar("mobile", { length: 20 }).notNull(),
      specializationIds: jsonb("specializationIds").notNull(),
      qualifications: jsonb("qualifications").notNull(),
      experienceYears: integer("experience_years").notNull(),
      patientSatisfactionRate: numeric("patientSatisfactionRate", { precision: 5, scale: 2 }).notNull(),
      hospitalId: uuid("hospitalId").references(() => hospitals.id, { onDelete: "set null" }),
      address: text("address").notNull(),
      image: text("image"),
      feePkr: numeric("fee_pkr", { precision: 10, scale: 2 }),
      consultationModes: jsonb("consultationModes"),
      openingTime: varchar("opening_time", { length: 10 }), 
      closingTime: varchar("closing_time", { length: 10 }), 
      availableDays: jsonb("available_days"),
      isActive: boolean("isActive").notNull().default(true),
      createdAt: timestamp("createdAt").notNull().defaultNow(),
      updatedAt: timestamp("updatedAt").notNull().defaultNow(),
    },
    (table) => {
      return {
        idxExperience: index("IDX_doctors_experience").on(table.experienceYears),
        idxHospitalId: index("IDX_doctors_hospitalId").on(table.hospitalId),
        idxSatisfaction: index("IDX_doctors_satisfaction").on(table.patientSatisfactionRate),
        idxSpecializationIds: index("IDX_doctors_specializationIds").on(table.specializationIds),
        idxUserId: index("IDX_doctors_userId").on(table.userId),
      };
    }
  );
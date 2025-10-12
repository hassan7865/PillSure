import { pgTable, uuid, varchar, text, timestamp, date, boolean, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const patients = pgTable("patients", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  gender: varchar("gender", { length: 20 }).notNull(), // male, female, other
  mobile: varchar("mobile", { length: 20 }).notNull(),
  dateOfBirth: date("dateOfBirth").notNull(),
  address: text("address").notNull(),
  bloodGroup: varchar("bloodGroup", { length: 10 }).notNull(),
  hasCovid: boolean("hasCovid").default(false).notNull(),
  pastMedicalHistory: jsonb("pastMedicalHistory"),
  surgicalHistory: text("surgicalHistory"),
  allergies: text("allergies"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

import { pgTable, varchar, boolean, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { roles } from './roles';

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }), // Made nullable for Google users
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  roleId: uuid("roleId").notNull().references(() => roles.id),
  isGoogle: boolean("isgoogle").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isEmailVerified: boolean("isEmailVerified").default(false).notNull(),
  onboardingStep: integer("onboardingStep").default(0).notNull(), // 0 = not started, 1 = step 1, 2 = step 2, 3 = completed
  isOnboardingComplete: boolean("isOnboardingComplete").default(false).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: false }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: false }).defaultNow().notNull(),
});

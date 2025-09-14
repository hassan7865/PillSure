import { pgTable, uuid, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const hospitals = pgTable("hospitals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  hospitalName: varchar("hospitalName", { length: 255 }).notNull(),
  hospitalAddress: text("hospitalAddress").notNull(),
  hospitalContactNo: varchar("hospitalContactNo", { length: 20 }).notNull(),
  hospitalEmail: varchar("hospitalEmail", { length: 255 }).notNull(),
  websiteHospital: varchar("websiteHospital", { length: 255 }),
  licenseNo: varchar("licenseNo", { length: 100 }).notNull(),
  adminName: varchar("adminName", { length: 255 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

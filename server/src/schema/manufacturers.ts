import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    legalName: varchar("legal_name", { length: 500 }).notNull(),
    shortName: varchar("short_name", { length: 200 }),
    addressLine: text("address_line").notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    province: varchar("province", { length: 120 }),
    postalCode: varchar("postal_code", { length: 20 }),
    country: varchar("country", { length: 120 }).notNull().default("Pakistan"),
    phone: varchar("phone", { length: 50 }),
    email: varchar("email", { length: 255 }),
    licenseNumber: varchar("license_number", { length: 120 }),
    website: text("website"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).defaultNow().notNull(),
  },
  (table) => ({
    idxCity: index("idx_manufacturers_city").on(table.city),
    idxLegalName: index("idx_manufacturers_legal_name").on(table.legalName),
    idxUserId: index("idx_manufacturers_user_id").on(table.userId),
    uqUserId: uniqueIndex("uq_manufacturers_user_id").on(table.userId),
  })
);

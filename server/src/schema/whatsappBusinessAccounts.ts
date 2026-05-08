import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { hospitals } from "./hospitals";
import { doctors } from "./doctor";
import { doctorPracticeAffiliations } from "./doctorPracticeAffiliations";

export const whatsappBusinessAccounts = pgTable(
  "whatsapp_business_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hospitalId: uuid("hospital_id").references(() => hospitals.id, {
      onDelete: "set null",
    }),
    doctorId: uuid("doctor_id").references(() => doctors.id, {
      onDelete: "set null",
    }),
    defaultPracticeAffiliationId: uuid("default_practice_affiliation_id").references(
      () => doctorPracticeAffiliations.id,
      { onDelete: "set null" }
    ),
    allowedDoctorIds: jsonb("allowed_doctor_ids").$type<string[]>(),
    phoneNumberId: varchar("phone_number_id", { length: 64 }).notNull(),
    displayPhoneNumber: varchar("display_phone_number", { length: 32 }),
    accessToken: text("access_token").notNull(),
    whatsappAppId: varchar("whatsapp_app_id", { length: 64 }).notNull(),
    wabaId: varchar("waba_id", { length: 64 }),
    isSetupComplete: boolean("is_setup_complete").notNull().default(false),
    totalMessagesSent: integer("total_messages_sent").notNull().default(0),
    totalMessagesReceived: integer("total_messages_received").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    uqPhoneNumberId: uniqueIndex("uq_whatsapp_business_accounts_phone_number_id").on(
      table.phoneNumberId
    ),
    idxOwner: index("idx_whatsapp_business_accounts_owner").on(table.ownerUserId),
  })
);

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { whatsappBusinessAccounts } from "./whatsappBusinessAccounts";
import { users } from "./users";

export const whatsappMessageHistory = pgTable(
  "whatsapp_message_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    whatsappAccountId: uuid("whatsapp_account_id").references(
      () => whatsappBusinessAccounts.id,
      { onDelete: "cascade" }
    ),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
    direction: varchar("direction", { length: 32 }).notNull(),
    body: text("body"),
    phoneNumberId: varchar("phone_number_id", { length: 64 }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxOwnerPhone: index("idx_whatsapp_message_history_owner_phone").on(
      table.ownerUserId,
      table.customerPhone
    ),
  })
);

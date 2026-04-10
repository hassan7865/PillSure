import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export type WhatsAppConversationMessage = {
  message?: string;
  response?: string;
  sender: "user" | "bot" | "businessUserInteraction";
  timestamp: string;
};

export const whatsappConversations = pgTable(
  "whatsapp_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    customerPhone: varchar("customer_phone", { length: 32 }).notNull(),
    messagesHistory: jsonb("messages_history").$type<WhatsAppConversationMessage[]>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    uqOwnerCustomer: uniqueIndex("uq_whatsapp_conversations_owner_customer").on(
      table.ownerUserId,
      table.customerPhone
    ),
    idxOwner: index("idx_whatsapp_conversations_owner").on(table.ownerUserId),
  })
);

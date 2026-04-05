import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export type ChatbotBusinessInfo = {
  businessName?: string;
  businessType?: string;
  ownerName?: string;
  about?: string;
  locations?: string[];
  businessEmail?: string;
  phoneNumber?: string;
};

export type ChatbotServiceSlot = {
  startTime: string;
  endTime: string;
  location?: string;
  isAvailable?: boolean;
};

export type ChatbotPersonaService = {
  serviceName: string;
  price?: number;
  currency?: string;
  slotDuration?: string;
  description?: string;
  availabilitySlots?: ChatbotServiceSlot[];
};

export const chatbotPersonas = pgTable(
  "chatbot_personas",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    businessType: varchar("business_type", { length: 128 }).notNull().default("healthcare"),
    ownerName: varchar("owner_name", { length: 255 }).notNull(),
    persona: text("persona").notNull(),
    businessInfo: jsonb("business_info").$type<ChatbotBusinessInfo>(),
    services: jsonb("services").$type<ChatbotPersonaService[]>().notNull(),
    whatsappNumber: varchar("whatsapp_number", { length: 32 }),
    logoUrl: text("logo_url"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: false }).notNull().defaultNow(),
  },
  (table) => ({
    idxOwnerActive: index("idx_chatbot_personas_owner_active").on(
      table.ownerUserId,
      table.isActive
    ),
  })
);

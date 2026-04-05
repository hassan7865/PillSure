import { eq, and } from "drizzle-orm";
import { db } from "../config/database";
import { whatsappBusinessAccounts } from "../schema/whatsappBusinessAccounts";
import { whatsappMessageHistory } from "../schema/whatsappMessageHistory";
import { whatsappConversations, type WhatsAppConversationMessage } from "../schema/whatsappConversations";
import { sendWhatsAppTextMessage } from "./whatsappGraph.service";
import { agenticChatbotService } from "./agenticChatbot.service";

const DEBOUNCE_MS = 5000;

type DebounceEntry = { timer: ReturnType<typeof setTimeout> | null; messages: string[] };
const debounceMap = new Map<string, DebounceEntry>();

export class WhatsAppWebhookService {
  async findAccountByPhoneNumberId(phoneNumberId: string) {
    const rows = await db
      .select()
      .from(whatsappBusinessAccounts)
      .where(eq(whatsappBusinessAccounts.phoneNumberId, phoneNumberId))
      .limit(1);
    return rows[0] || null;
  }

  async saveHistory(params: {
    ownerUserId: string;
    accountId: string | null;
    customerPhone: string;
    direction: string;
    body: string;
    phoneNumberId: string;
    metadata?: Record<string, unknown>;
  }) {
    await db.insert(whatsappMessageHistory).values({
      ownerUserId: params.ownerUserId,
      whatsappAccountId: params.accountId,
      customerPhone: params.customerPhone,
      direction: params.direction,
      body: params.body,
      phoneNumberId: params.phoneNumberId,
      metadata: params.metadata,
    });
  }

  async processIncomingText(phoneNumberId: string, from: string, text: string): Promise<void> {
    const account = await this.findAccountByPhoneNumberId(phoneNumberId);
    if (!account) {
      console.warn(`[WhatsApp] No account for phone_number_id=${phoneNumberId}`);
      return;
    }

    await db
      .update(whatsappBusinessAccounts)
      .set({
        totalMessagesReceived: account.totalMessagesReceived + 1,
        updatedAt: new Date(),
      })
      .where(eq(whatsappBusinessAccounts.id, account.id));

    await this.saveHistory({
      ownerUserId: account.ownerUserId,
      accountId: account.id,
      customerPhone: from,
      direction: "incoming",
      body: text,
      phoneNumberId,
    });

    const key = `${phoneNumberId}:${from}`;
    let entry = debounceMap.get(key);
    if (!entry) {
      entry = { timer: null, messages: [] };
      debounceMap.set(key, entry);
    }
    if (entry.timer) {
      clearTimeout(entry.timer);
    }
    entry.messages.push(text);

    entry.timer = setTimeout(async () => {
      const current = debounceMap.get(key);
      debounceMap.delete(key);
      if (!current?.messages.length) {
        return;
      }
      const combined =
        current.messages.length > 1 ? current.messages.join("\n") : current.messages[current.messages.length - 1];

      const fresh = await this.findAccountByPhoneNumberId(phoneNumberId);
      if (!fresh) {
        return;
      }
      const allowed = (fresh.allowedDoctorIds as string[] | null) || null;

      try {
        const chat = await agenticChatbotService.generateResponse(combined, from, {
          ownerUserId: fresh.ownerUserId,
          defaultDoctorId: fresh.doctorId,
          allowedDoctorIds: allowed,
        });

        if (chat.ignored) {
          return;
        }

        const send = await sendWhatsAppTextMessage({
          phoneNumberId,
          accessToken: fresh.accessToken,
          to: from,
          body: chat.response,
        });

        if (send.success) {
          await db
            .update(whatsappBusinessAccounts)
            .set({
              totalMessagesSent: fresh.totalMessagesSent + 1,
              updatedAt: new Date(),
            })
            .where(eq(whatsappBusinessAccounts.id, fresh.id));

          await this.saveHistory({
            ownerUserId: fresh.ownerUserId,
            accountId: fresh.id,
            customerPhone: from,
            direction: "outgoing",
            body: chat.response,
            phoneNumberId,
            metadata: {
              chatbotGenerated: true,
              bookingResult: chat.bookingResult,
            },
          });
        } else {
          console.error("[WhatsApp] send failed", send.error);
        }
      } catch (e) {
        console.error("[WhatsApp] processIncomingText", e);
        const fallback = "Sorry, something went wrong. Please try again shortly.";
        await sendWhatsAppTextMessage({
          phoneNumberId,
          accessToken: fresh.accessToken,
          to: from,
          body: fallback,
        });
      }
    }, DEBOUNCE_MS);
  }

  async processHumanEcho(phoneNumberId: string, from: string, to: string, text: string): Promise<void> {
    const account = await this.findAccountByPhoneNumberId(phoneNumberId);
    if (!account) {
      return;
    }

    await this.saveHistory({
      ownerUserId: account.ownerUserId,
      accountId: account.id,
      customerPhone: to,
      direction: "humanInteraction",
      body: text,
      phoneNumberId,
      metadata: { sentFrom: from, sentTo: to, source: "whatsapp_business_app" },
    });

    const existingRows = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.ownerUserId, account.ownerUserId),
          eq(whatsappConversations.customerPhone, to)
        )
      )
      .limit(1);
    const existing = existingRows[0];

    const nowIso = new Date().toISOString();
    const entry: WhatsAppConversationMessage = {
      message: text,
      sender: "businessUserInteraction",
      timestamp: nowIso,
    };

    if (existing) {
      const hist = [...(existing.messagesHistory as WhatsAppConversationMessage[]), entry];
      await db
        .update(whatsappConversations)
        .set({
          messagesHistory: hist,
          metadata: { ...((existing.metadata as object) || {}), lastMessageAt: nowIso },
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversations.id, existing.id));
    } else {
      await db.insert(whatsappConversations).values({
        ownerUserId: account.ownerUserId,
        customerPhone: to,
        messagesHistory: [entry],
        metadata: { lastMessageAt: nowIso },
        isActive: true,
      });
    }
  }
}

export const whatsappWebhookService = new WhatsAppWebhookService();

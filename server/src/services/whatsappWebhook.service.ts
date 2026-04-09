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

  /**
   * After Stripe marks the appointment paid, notify the WhatsApp thread that started the booking.
   * Best-effort: logs and returns on missing account or send failure (does not throw).
   */
  async notifyAppointmentPaidOnWhatsApp(params: {
    ownerUserId: string;
    customerPhone: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationMode: string;
    doctorDisplayName?: string;
  }): Promise<void> {
    const accounts = await db
      .select()
      .from(whatsappBusinessAccounts)
      .where(eq(whatsappBusinessAccounts.ownerUserId, params.ownerUserId))
      .limit(1);

    const account = accounts[0];
    if (!account) {
      console.warn(
        "[WhatsApp] notifyAppointmentPaid: no business account for owner",
        params.ownerUserId
      );
      return;
    }

    const doctorPart = params.doctorDisplayName
      ? ` with ${params.doctorDisplayName}`
      : "";
    const modeLabel =
      params.consultationMode === "online"
        ? "online"
        : params.consultationMode === "inperson"
          ? "in person"
          : params.consultationMode;

    const body = `Payment received — your appointment${doctorPart} is confirmed for ${params.appointmentDate} at ${params.appointmentTime} (${modeLabel}). Thank you!`;

    const send = await sendWhatsAppTextMessage({
      phoneNumberId: account.phoneNumberId,
      accessToken: account.accessToken,
      to: params.customerPhone,
      body,
    });

    if (!send.success) {
      console.error("[WhatsApp] notifyAppointmentPaid send failed", send.error);
      return;
    }

    await db
      .update(whatsappBusinessAccounts)
      .set({
        totalMessagesSent: account.totalMessagesSent + 1,
        updatedAt: new Date(),
      })
      .where(eq(whatsappBusinessAccounts.id, account.id));

    await this.saveHistory({
      ownerUserId: params.ownerUserId,
      accountId: account.id,
      customerPhone: params.customerPhone,
      direction: "outgoing",
      body,
      phoneNumberId: account.phoneNumberId,
      metadata: { paymentConfirmation: true },
    });

    const convRows = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.ownerUserId, params.ownerUserId),
          eq(whatsappConversations.customerPhone, params.customerPhone),
          eq(whatsappConversations.isActive, true)
        )
      )
      .limit(1);

    const nowIso = new Date().toISOString();
    const botEntry: WhatsAppConversationMessage = {
      response: body,
      sender: "bot",
      timestamp: nowIso,
    };

    if (convRows.length) {
      const prev = (convRows[0].messagesHistory as WhatsAppConversationMessage[]) || [];
      const hist = [...prev, botEntry].slice(-200);
      await db
        .update(whatsappConversations)
        .set({
          messagesHistory: hist,
          metadata: { ...((convRows[0].metadata as object) || {}), lastMessageAt: nowIso },
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversations.id, convRows[0].id));
    } else {
      await db.insert(whatsappConversations).values({
        ownerUserId: params.ownerUserId,
        customerPhone: params.customerPhone,
        messagesHistory: [botEntry],
        metadata: { lastMessageAt: nowIso },
        isActive: true,
      });
    }
  }
}

export const whatsappWebhookService = new WhatsAppWebhookService();

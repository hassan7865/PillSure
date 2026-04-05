import { eq, and } from "drizzle-orm";
import { db } from "../config/database";
import {
  chatbotPersonas,
  type ChatbotPersonaService,
} from "../schema/chatbotPersonas";
import {
  whatsappConversations,
  type WhatsAppConversationMessage,
} from "../schema/whatsappConversations";
import { appointmentService } from "./appointment.service";
import { stripeService } from "./stripe.service";
import { ensureGuestUserForWhatsApp } from "./guestUser.service";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3.5";

type GenerateContext = {
  ownerUserId: string;
  defaultDoctorId: string | null;
  allowedDoctorIds: string[] | null;
};

export type ChatbotGenerateResult = {
  response: string;
  ignored?: boolean;
  reason?: string;
  bookingResult?: {
    success: boolean;
    appointmentId?: string;
    checkoutUrl?: string;
    message?: string;
  };
};

const callOllamaChat = async (messages: { role: string; content: string }[], options?: { temperature?: number; numPredict?: number }) => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.numPredict ?? 800,
      },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama error ${res.status}: ${t}`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return (data.message?.content || "").trim();
};

const stripJson = (raw: string): string => {
  const s = raw.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return s.slice(start, end + 1);
  }
  return s;
};

const servicesToPromptBlock = (services: ChatbotPersonaService[]): string => {
  if (!services?.length) {
    return "No services configured yet.";
  }
  return services
    .map((s) => {
      const slots =
        s.availabilitySlots
          ?.filter((x) => x.isAvailable !== false)
          .map((sl) => `${sl.startTime}-${sl.endTime}${sl.location ? ` @${sl.location}` : ""}`)
          .join(", ") || "see schedule in conversation";
      return `- ${s.serviceName}: ${s.description || ""} | price: ${s.price ?? "?"} ${s.currency || ""} | slots: ${slots}`;
    })
    .join("\n");
};

const resolveDoctorId = (
  ctx: GenerateContext,
  fromModel: string | null | undefined
): string | null => {
  if (ctx.defaultDoctorId) {
    return ctx.defaultDoctorId;
  }
  if (ctx.allowedDoctorIds?.length === 1) {
    return ctx.allowedDoctorIds[0];
  }
  if (fromModel && ctx.allowedDoctorIds?.includes(fromModel)) {
    return fromModel;
  }
  if (fromModel && /^[0-9a-f-]{36}$/i.test(fromModel)) {
    return fromModel;
  }
  return null;
};

export class AgenticChatbotService {
  async generateResponse(
    userMessage: string,
    customerPhone: string,
    ctx: GenerateContext
  ): Promise<ChatbotGenerateResult> {
    const personaRows = await db
      .select()
      .from(chatbotPersonas)
      .where(
        and(eq(chatbotPersonas.ownerUserId, ctx.ownerUserId), eq(chatbotPersonas.isActive, true))
      )
      .limit(1);

    if (!personaRows.length) {
      return {
        response:
          "Sorry, this practice has not finished WhatsApp assistant setup yet. Please call the clinic directly.",
      };
    }

    const persona = personaRows[0];

    const convRows = await db
      .select()
      .from(whatsappConversations)
      .where(
        and(
          eq(whatsappConversations.ownerUserId, ctx.ownerUserId),
          eq(whatsappConversations.customerPhone, customerPhone),
          eq(whatsappConversations.isActive, true)
        )
      )
      .limit(1);

    let messagesHistory: WhatsAppConversationMessage[] =
      (convRows[0]?.messagesHistory as WhatsAppConversationMessage[]) || [];

    const recentBusiness = [...messagesHistory].reverse().find((m) => m.sender === "businessUserInteraction");
    if (recentBusiness?.timestamp) {
      const last = new Date(recentBusiness.timestamp).getTime();
      if (Date.now() - last < 10 * 60 * 1000) {
        return {
          response: "",
          ignored: true,
          reason: "business_owner_recent_interaction",
        };
      }
    }

    const slice = messagesHistory.slice(-10);
    const doctorHint =
      ctx.defaultDoctorId ||
      (ctx.allowedDoctorIds?.length ? ctx.allowedDoctorIds.join(", ") : "not fixed — ask which doctor if needed");

    const systemPrompt = `You are ${persona.ownerName} representing ${persona.businessName} (${persona.businessType}).
You are chatting on WhatsApp to help patients book appointments.

Services and availability hints:
${servicesToPromptBlock(persona.services as ChatbotPersonaService[])}

Doctor id context (use for internal booking only; do not recite UUIDs unless asked): ${doctorHint}

Be concise, warm, and professional. Help the user pick a service, date, and time. Use 24h or clear times.
Current date (UTC): ${new Date().toISOString().split("T")[0]}.`;

    const conversationMessages = slice.flatMap((msg) => {
      const out: { role: "user" | "assistant"; content: string }[] = [];
      if (msg.sender === "user" && msg.message) {
        out.push({ role: "user", content: msg.message });
      }
      if (msg.sender === "bot" && msg.response) {
        out.push({ role: "assistant", content: msg.response });
      }
      return out;
    });

    let assistantReply = await callOllamaChat(
      [{ role: "system", content: systemPrompt }, ...conversationMessages, { role: "user", content: userMessage }],
      { temperature: 0.75, numPredict: 800 }
    );

    if (!assistantReply) {
      assistantReply = "I could not process that just now. Could you please repeat your request?";
    }

    let bookingResult: ChatbotGenerateResult["bookingResult"];

    const bookingAnalysisPrompt = `Decide if the user has CONFIRMED a new appointment (not just asking availability).
Return JSON only:
{
  "shouldBook": boolean,
  "confidence": 0-100,
  "doctorId": string or null,
  "appointmentDate": "YYYY-MM-DD" or null,
  "appointmentTime": "HH:MM" 24h or null,
  "consultationMode": "inperson" | "online" or null,
  "serviceName": string or null,
  "patientFirstName": string or null,
  "patientLastName": string or null
}

Rules:
- shouldBook true only if date+time+service intent are explicit enough to reserve a slot.
- Map 12h times to 24h.
- confidence < 70 => shouldBook false.

Conversation (latest user message last):
User: ${userMessage}
Assistant draft: ${assistantReply}`;

    const rawAnalysis = await callOllamaChat(
      [
        { role: "system", content: "You output JSON only, no markdown." },
        { role: "user", content: bookingAnalysisPrompt },
      ],
      { temperature: 0.1, numPredict: 400 }
    );

    try {
      const parsed = JSON.parse(stripJson(rawAnalysis)) as {
        shouldBook?: boolean;
        confidence?: number;
        doctorId?: string | null;
        appointmentDate?: string | null;
        appointmentTime?: string | null;
        consultationMode?: string | null;
        serviceName?: string | null;
        patientFirstName?: string | null;
        patientLastName?: string | null;
      };

      if (
        parsed.shouldBook &&
        typeof parsed.confidence === "number" &&
        parsed.confidence >= 70 &&
        parsed.appointmentDate &&
        parsed.appointmentTime &&
        parsed.consultationMode &&
        ["inperson", "online"].includes(parsed.consultationMode)
      ) {
        const doctorId = resolveDoctorId(ctx, parsed.doctorId);
        if (!doctorId) {
          bookingResult = {
            success: false,
            message: "Could not determine doctor for booking.",
          };
        } else {
          const patientUserId = await ensureGuestUserForWhatsApp({
            phoneE164: customerPhone,
            firstName: parsed.patientFirstName || undefined,
            lastName: parsed.patientLastName || undefined,
          });

          const patientNotes = [
            parsed.serviceName ? `Service: ${parsed.serviceName}` : "",
            "Booked via WhatsApp",
          ]
            .filter(Boolean)
            .join(" | ");

          const apt = await appointmentService.createAppointment(patientUserId, {
            doctorId,
            appointmentDate: parsed.appointmentDate,
            appointmentTime: parsed.appointmentTime,
            consultationMode: parsed.consultationMode,
            patientNotes,
          });

          const fee = await appointmentService.getDoctorFeeAndName(doctorId);
          const session = await stripeService.createAppointmentCheckoutSession({
            amountPkr: fee.feePkr,
            doctorName: fee.doctorName,
            metadata: {
              patientId: patientUserId,
              doctorId,
              appointmentDate: parsed.appointmentDate,
              appointmentTime: parsed.appointmentTime,
              consultationMode: parsed.consultationMode as "inperson" | "online",
              patientNotes,
              appointmentId: apt.id,
            },
          });

          bookingResult = {
            success: true,
            appointmentId: apt.id,
            checkoutUrl: session.url || undefined,
            message: "pending_checkout",
          };

          assistantReply = `${assistantReply}\n\nYour appointment is on hold until payment. Pay here: ${session.url}`;
        }
      }
    } catch {
      /* ignore booking parse errors */
    }

    const nowIso = new Date().toISOString();
    const userEntry: WhatsAppConversationMessage = {
      message: userMessage,
      sender: "user",
      timestamp: nowIso,
    };
    const botEntry: WhatsAppConversationMessage = {
      response: assistantReply,
      sender: "bot",
      timestamp: nowIso,
    };
    const nextHistory = [...messagesHistory, userEntry, botEntry].slice(-200);

    const meta = {
      ...((convRows[0]?.metadata as object) || {}),
      lastMessageAt: nowIso,
    };

    if (convRows.length) {
      await db
        .update(whatsappConversations)
        .set({
          messagesHistory: nextHistory,
          metadata: meta,
          updatedAt: new Date(),
        })
        .where(eq(whatsappConversations.id, convRows[0].id));
    } else {
      await db.insert(whatsappConversations).values({
        ownerUserId: ctx.ownerUserId,
        customerPhone,
        messagesHistory: nextHistory,
        metadata: meta,
        isActive: true,
      });
    }

    return { response: assistantReply, bookingResult };
  }
}

export const agenticChatbotService = new AgenticChatbotService();

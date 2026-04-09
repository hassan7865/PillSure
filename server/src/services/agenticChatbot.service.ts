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
import {
  getEnglishWeekdayLongForYmd,
  getNowHmInTimeZone,
  getTodayYmdInTimeZone,
  getWhatsAppClinicTimeZone,
  isStrictlyFutureAppointment,
  isValidYmd,
  normalizeHm,
} from "../utils/clinicTime.util";
import {
  computeBookableStartTimes,
  findServiceByNameLoose,
  isStartAllowedForService,
  parseDurationMinutes,
  pickNearestBookable,
  summarizeHoursWindowsFromSlots,
  summarizeOfferedWeekdaysFromSlots,
} from "../utils/whatsappBookingSlots.util";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:latest";
const OLLAMA_FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || "llama3.1";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

const CONFIDENCE_MIN = 70;
const BOOKING_CONFIRM_MIN = 78;

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

type IntentAnalysis = {
  listAppointments?: { wants?: boolean; confidence?: number };
  cancel?: {
    wants?: boolean;
    confidence?: number;
    appointmentOrdinal?: number | null;
    appointmentId?: string | null;
    reason?: string | null;
  };
  reschedule?: {
    wants?: boolean;
    confidence?: number;
    appointmentOrdinal?: number | null;
    appointmentId?: string | null;
    newDate?: string | null;
    newTime?: string | null;
  };
  books?: Array<{
    confidence?: number;
    doctorId?: string | null;
    appointmentDate?: string | null;
    appointmentTime?: string | null;
    consultationMode?: string | null;
    serviceName?: string | null;
    patientFirstName?: string | null;
    patientLastName?: string | null;
    /** Must be true only when the user clearly confirmed this booking (e.g. "yes book it"). */
    explicitlyConfirmed?: boolean;
  }>;
};

type BookIntent = NonNullable<IntentAnalysis["books"]>[number];

const extractYmdsFromTexts = (texts: string[]): string[] => {
  const set = new Set<string>();
  const re = /\b(\d{4}-\d{2}-\d{2})\b/g;
  for (const t of texts) {
    if (!t) continue;
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (isValidYmd(m[1])) set.add(m[1]);
    }
  }
  return [...set].sort();
};

const buildCalendarFactsLine = (ymds: string[], clinicTz: string): string => {
  const cap = ymds.slice(0, 16);
  if (!cap.length) return "";
  const parts = cap.map((ymd) => {
    const wd = getEnglishWeekdayLongForYmd(ymd, clinicTz);
    const w = wd ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)}` : "?";
    return `${ymd}=${w}`;
  });
  return `Calendar facts (${clinicTz}, weekday for each date — use exactly this, never guess): ${parts.join("; ")}.`;
};

const bookIntentKey = (b: BookIntent): string => {
  const d = b.appointmentDate?.trim() || "_";
  const t = b.appointmentTime?.trim() ? normalizeHm(b.appointmentTime) : "_";
  const s = (b.serviceName || "").trim().toLowerCase() || "_";
  return `${d}|${t}|${s}`;
};

const dedupeIntentBooks = (books: BookIntent[]): BookIntent[] => {
  const map = new Map<string, BookIntent>();
  for (const b of books) {
    const k = bookIntentKey(b);
    const prev = map.get(k);
    if (!prev) {
      map.set(k, { ...b });
      continue;
    }
    map.set(k, {
      ...prev,
      ...b,
      confidence: Math.max(prev.confidence ?? 0, b.confidence ?? 0),
      explicitlyConfirmed: Boolean(prev.explicitlyConfirmed || b.explicitlyConfirmed),
    });
  }
  return [...map.values()];
};

const takeSingleBookUnlessMultiRequested = (books: BookIntent[], userMessage: string): BookIntent[] => {
  if (books.length <= 1) return books;
  const multi = /\b(two|both|twice|2\s+appointments|two\s+appointments|another\s+booking|a\s+second\s+appointment|second\s+booking)\b/i.test(
    userMessage
  );
  if (multi) return dedupeIntentBooks(books);

  const ymdInUser = extractYmdsFromTexts([userMessage]);
  const preferredDate = ymdInUser.length ? ymdInUser[ymdInUser.length - 1] : null;
  if (preferredDate) {
    const onDate = books.filter((b) => b.appointmentDate === preferredDate);
    if (onDate.length === 1) {
      return onDate;
    }
    if (onDate.length > 1) {
      const sorted = [...onDate].sort((a, b) => {
        const ea = a.explicitlyConfirmed ? 1 : 0;
        const eb = b.explicitlyConfirmed ? 1 : 0;
        if (eb !== ea) return eb - ea;
        return (b.confidence ?? 0) - (a.confidence ?? 0);
      });
      return [sorted[0]];
    }
  }

  const sorted = [...books].sort((a, b) => {
    const ea = a.explicitlyConfirmed ? 1 : 0;
    const eb = b.explicitlyConfirmed ? 1 : 0;
    if (eb !== ea) return eb - ea;
    return (b.confidence ?? 0) - (a.confidence ?? 0);
  });
  return [sorted[0]];
};

const normalizeParsedIntentBooks = (intent: IntentAnalysis, userMessage: string): IntentAnalysis => {
  if (!intent.books?.length) return intent;
  let books = dedupeIntentBooks(intent.books);
  books = takeSingleBookUnlessMultiRequested(books, userMessage);
  return { ...intent, books };
};

const callOllamaChatWithModel = async (
  model: string,
  messages: { role: string; content: string }[],
  options?: { temperature?: number; numPredict?: number }
) => {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        num_predict: options?.numPredict ?? 800,
      },
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  });
  return res;
};

const callOllamaChat = async (
  messages: { role: string; content: string }[],
  options?: { temperature?: number; numPredict?: number }
) => {
  let res = await callOllamaChatWithModel(OLLAMA_MODEL, messages, options);
  if (!res.ok) {
    const errText = await res.text();
    const isMissingModel = res.status === 404 || /model .* not found/i.test(errText);
    if (isMissingModel && OLLAMA_FALLBACK_MODEL && OLLAMA_FALLBACK_MODEL !== OLLAMA_MODEL) {
      res = await callOllamaChatWithModel(OLLAMA_FALLBACK_MODEL, messages, options);
      if (!res.ok) {
        const fallbackErr = await res.text();
        throw new Error(`Ollama fallback error ${res.status}: ${fallbackErr}`);
      }
    } else {
      throw new Error(`Ollama error ${res.status}: ${errText}`);
    }
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
      const dur = s.slotDuration || "30";
      const slots =
        s.availabilitySlots
          ?.filter((x) => x.isAvailable !== false)
          .map((sl) => {
            const day = sl.day?.trim() ? `${sl.day.trim()} ` : "";
            return `${day}${sl.startTime}-${sl.endTime}${sl.location ? ` @${sl.location}` : ""}`;
          })
          .join(", ") || "open-ended (any time that does not clash)";
      return `- ${s.serviceName}: ${s.description || ""} | price: ${s.price ?? "?"} ${s.currency || ""} | duration_minutes: ${dur} | slots: ${slots}`;
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

const transcriptFromHistory = (
  slice: WhatsAppConversationMessage[],
  latestUser: string
): string => {
  const lines: string[] = [];
  for (const msg of slice) {
    if (msg.sender === "user" && msg.message) {
      lines.push(`User: ${msg.message}`);
    }
    if (msg.sender === "bot" && msg.response) {
      lines.push(`Assistant: ${msg.response}`);
    }
  }
  lines.push(`User: ${latestUser}`);
  return lines.join("\n");
};

const resolveAppointmentIdFromMeta = (
  meta: Record<string, unknown>,
  ordinal: number | null | undefined,
  explicitId: string | null | undefined
): string | null => {
  if (explicitId && /^[0-9a-f-]{36}$/i.test(explicitId.trim())) {
    return explicitId.trim();
  }
  const listed = (meta.lastListedAppointmentIds as string[] | undefined) || [];
  if (ordinal != null && Number.isFinite(ordinal) && ordinal >= 1) {
    const idx = Math.floor(ordinal) - 1;
    return listed[idx] ?? null;
  }
  if (listed.length === 1) {
    return listed[0];
  }
  return null;
};

const MODIFY_DENIED =
  "That appointment is too soon to change on WhatsApp (must be more than one full calendar day away). Please call the clinic.";

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
    const services = (persona.services as ChatbotPersonaService[]) || [];

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

    const slice = messagesHistory.slice(-12);
    const doctorHint =
      ctx.defaultDoctorId ||
      (ctx.allowedDoctorIds?.length ? ctx.allowedDoctorIds.join(", ") : "not fixed — ask which doctor if needed");

    const clinicTz = getWhatsAppClinicTimeZone();
    const todayClinic = getTodayYmdInTimeZone(clinicTz);

    const textsForCalendar: string[] = [userMessage];
    for (const m of slice) {
      if (m.sender === "user" && m.message) textsForCalendar.push(m.message);
      if (m.sender === "bot" && m.response) textsForCalendar.push(m.response);
    }
    const ymdsInThread = extractYmdsFromTexts(textsForCalendar);
    const ymdsForFacts = [...new Set([...(isValidYmd(todayClinic) ? [todayClinic] : []), ...ymdsInThread])].sort();
    const calendarFactsLine = buildCalendarFactsLine(ymdsForFacts, clinicTz);

    const systemPrompt = `You are ${persona.ownerName} representing ${persona.businessName} (${persona.businessType}).
You are chatting on WhatsApp to help patients book, list, reschedule, and cancel appointments.

Services and availability (respect slot windows; do not invent times outside them when slots are listed):
${servicesToPromptBlock(services)}

${calendarFactsLine ? `${calendarFactsLine}\n` : ""}
If a slot row names a weekday, that day uses those hours. If slots only show hours (no weekday) but the description says Mon–Fri (or similar), treat those weekdays as open; do not call a weekday "closed" if it is inside that described range unless the text explicitly excludes it.
For any YYYY-MM-DD you mention, the weekday must match the calendar facts line above (clinic TZ ${clinicTz}). If there is no fact line for a date, do not guess the weekday—use the date only.
Last bookable start time: window end minus consultation duration (e.g. 30 min before 17:00 closes ⇒ last start 16:30, not 17:00). 4:30 PM = 16:30.

Doctor id context (internal only; never read UUIDs aloud unless user explicitly asks): ${doctorHint}

Standard booking flow: confirm service → date (YYYY-MM-DD) → time (24h HH:MM) → in-person vs online → the user's name → explicit confirmation (e.g. "yes, book it") before creating a hold. Never create a booking from vague messages.
Only one unpaid future booking per patient at a time: if they already have an unpaid upcoming appointment, they must pay it before booking another.
Policy: reschedule and cancellation on WhatsApp are only possible when the appointment date is more than one full calendar day after today in the clinic timezone (${clinicTz}). Today in clinic: ${todayClinic}. If the user asks to change/cancel too soon, politely ask them to call the clinic.

Do not invent upcoming appointments, duplicate bookings, or payment links in your reply—the system appends verified lists and checkout links when needed.

When the user has several upcoming appointments, list them with numbers. For reschedule/cancel they may say "the second one" — the system maps that using ordinals.

Be concise, warm, and professional. Use 24h times or clearly label AM/PM.
UTC now (reference): ${new Date().toISOString()}.`;

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
      { temperature: 0.72, numPredict: 900 }
    );

    if (!assistantReply) {
      assistantReply = "I could not process that just now. Could you please repeat your request?";
    }

    let bookingResult: ChatbotGenerateResult["bookingResult"];
    const extras: string[] = [];

    const transcript = transcriptFromHistory(slice, userMessage);
    const intentPrompt = `You analyze a WhatsApp clinic conversation. Return JSON only (no markdown).

Transcript (chronological, latest at bottom):
${transcript}

JSON schema:
{
  "listAppointments": { "wants": boolean, "confidence": 0-100 },
  "cancel": { "wants": boolean, "confidence": 0-100, "appointmentOrdinal": number or null, "appointmentId": string or null, "reason": string or null },
  "reschedule": { "wants": boolean, "confidence": 0-100, "appointmentOrdinal": number or null, "appointmentId": string or null, "newDate": "YYYY-MM-DD" or null, "newTime": "HH:MM" or null },
  "books": [
    {
      "confidence": 0-100,
      "explicitlyConfirmed": boolean,
      "doctorId": string or null,
      "appointmentDate": "YYYY-MM-DD" or null,
      "appointmentTime": "HH:MM" 24h or null,
      "consultationMode": "inperson" | "online" or null,
      "serviceName": string or null,
      "patientFirstName": string or null,
      "patientLastName": string or null
    }
  ]
}

Rules:
- Use at most one object in "books" unless the user's latest message clearly asks for two separate appointments (e.g. "book two visits", "both").
- Multiple separate bookings in one message => multiple objects in "books". Each must have explicitlyConfirmed true only after the user clearly confirms that specific booking.
- "listAppointments.wants" true when user asks to see / list / show their bookings.
- cancel/reschedule wants true only with clear intent; use appointmentOrdinal 1-based from your last numbered list in the transcript if user refers to "first/second".
- confidence < ${CONFIDENCE_MIN} => treat wants as false. For books: also require confidence >= ${BOOKING_CONFIRM_MIN} AND explicitlyConfirmed true to create an appointment; otherwise the assistant should only ask for missing details.
- explicitlyConfirmed true ONLY when the user clearly confirms the booking with intent like "yes, book it", "confirm booking", "go ahead and book" — not vague phrases like "ok", "do it", or "sure" alone.
- Map 12h times to 24h.
- If unsure between list vs book, prefer lower confidence so the assistant can clarify.`;

    let parsedIntent: IntentAnalysis = {};
    try {
      const rawIntent = await callOllamaChat(
        [
          { role: "system", content: "You output JSON only, no markdown." },
          { role: "user", content: intentPrompt },
        ],
        { temperature: 0.05, numPredict: 900 }
      );
      parsedIntent = normalizeParsedIntentBooks(
        JSON.parse(stripJson(rawIntent)) as IntentAnalysis,
        userMessage
      );
    } catch {
      parsedIntent = {};
    }

    const cancelHigh =
      (parsedIntent.cancel?.wants && (parsedIntent.cancel?.confidence ?? 0) >= CONFIDENCE_MIN) || false;
    const rescheduleHigh =
      (parsedIntent.reschedule?.wants && (parsedIntent.reschedule?.confidence ?? 0) >= CONFIDENCE_MIN) || false;
    let skipCancelAndRescheduleTogether = false;
    if (cancelHigh && rescheduleHigh) {
      skipCancelAndRescheduleTogether = true;
    }

    const prevMeta = (convRows[0]?.metadata as Record<string, unknown>) || {};
    let meta: Record<string, unknown> = { ...prevMeta };

    const needsPatient =
      (parsedIntent.listAppointments?.wants &&
        (parsedIntent.listAppointments?.confidence ?? 0) >= CONFIDENCE_MIN) ||
      (parsedIntent.books && parsedIntent.books.some((b) => (b.confidence ?? 0) >= CONFIDENCE_MIN)) ||
      (parsedIntent.reschedule?.wants && (parsedIntent.reschedule?.confidence ?? 0) >= CONFIDENCE_MIN) ||
      (parsedIntent.cancel?.wants && (parsedIntent.cancel?.confidence ?? 0) >= CONFIDENCE_MIN);

    let patientUserId: string | null = null;
    if (needsPatient) {
      patientUserId = await ensureGuestUserForWhatsApp({
        phoneE164: customerPhone,
        firstName: undefined,
        lastName: undefined,
      });
    }

    const doctorFilter = ctx.defaultDoctorId || undefined;
    const allowedDocs = ctx.allowedDoctorIds;

    if (
      patientUserId &&
      parsedIntent.listAppointments?.wants &&
      (parsedIntent.listAppointments.confidence ?? 0) >= CONFIDENCE_MIN
    ) {
      try {
        const rows = await appointmentService.listUpcomingForWhatsAppPatient({
          patientUserId,
          doctorIdFilter: doctorFilter ?? null,
          allowedDoctorIds: allowedDocs,
        });
        if (!rows.length) {
          extras.push("I do not see any upcoming appointments on file for this number.");
          meta = { ...meta, lastListedAppointmentIds: [], lastListedAt: new Date().toISOString() };
        } else {
          const lines = rows.map((r, i) => {
            const pay = r.paymentStatus === "paid" ? "paid" : "payment pending";
            const short = r.id.slice(0, 8);
            const rawDate = r.appointmentDate as unknown;
            const d =
              rawDate instanceof Date
                ? rawDate.toISOString().slice(0, 10)
                : String(rawDate).slice(0, 10);
            return `${i + 1}) ${d} ${normalizeHm(r.appointmentTime)} (${r.consultationMode}, ${pay}) with ${r.doctorName.trim()} — ref ${short}`;
          });
          extras.push(`Your upcoming appointments:\n${lines.join("\n")}\nReply with the number if you want to reschedule or cancel one.`);
          meta = {
            ...meta,
            lastListedAppointmentIds: rows.map((r) => r.id),
            lastListedAt: new Date().toISOString(),
          };
        }
      } catch (e) {
        console.error("[WhatsApp agent] list appointments", e);
        extras.push("I could not load your appointments just now. Please try again shortly.");
      }
    }

    if (patientUserId && parsedIntent.books?.length) {
      const doctorId = resolveDoctorId(ctx, null);
      if (!doctorId) {
        extras.push("I need to know which doctor to book with. Please contact the clinic to link this WhatsApp number to a doctor.");
        bookingResult = { success: false, message: "no_doctor" };
      } else {
        let bookIndex = 0;
        for (const b of parsedIntent.books) {
          bookIndex += 1;
          if ((b.confidence ?? 0) < CONFIDENCE_MIN) continue;
          if (!b.explicitlyConfirmed || (b.confidence ?? 0) < BOOKING_CONFIRM_MIN) {
            extras.push(
              `Booking #${bookIndex}: I need everything confirmed first: service, date, time, online or in-person, your first name, and a clear "yes, book it" before I can reserve a slot.`
            );
            continue;
          }
          if (!b.appointmentDate || !b.appointmentTime || !b.consultationMode) {
            extras.push(`Booking #${bookIndex}: I still need a clear date, time, and whether you want online or in-person.`);
            continue;
          }
          if (!["inperson", "online"].includes(String(b.consultationMode))) {
            extras.push(`Booking #${bookIndex}: Please say if you prefer an online or in-person visit.`);
            continue;
          }
          if (!isValidYmd(b.appointmentDate)) {
            extras.push(`Booking #${bookIndex}: The date did not look valid. Please use YYYY-MM-DD.`);
            continue;
          }
          if (!isStrictlyFutureAppointment(b.appointmentDate, b.appointmentTime, clinicTz)) {
            extras.push(
              `Booking #${bookIndex}: Appointments must be in the future. Pick a later date or time.`
            );
            continue;
          }
          if (!b.patientFirstName?.trim()) {
            extras.push(`Booking #${bookIndex}: What first name should I put on the booking?`);
            continue;
          }

          let service = findServiceByNameLoose(services, b.serviceName || null);
          if (!service && services.length === 1) {
            service = services[0];
          }
          if (!service) {
            const names = services.map((s) => s.serviceName).join(", ");
            extras.push(
              `Booking #${bookIndex}: Which service do you want? Available: ${names || "none configured — please call the clinic"}.`
            );
            continue;
          }

          const intervals = await appointmentService.getBookedIntervalsForDate(doctorId, b.appointmentDate);
          const openDaysPhrase = summarizeOfferedWeekdaysFromSlots(service.availabilitySlots);
          const hoursPhrase = summarizeHoursWindowsFromSlots(service.availabilitySlots);
          const hoursHint = hoursPhrase ? ` Typical hours in our schedule: ${hoursPhrase}.` : "";

          let allowed = isStartAllowedForService(
            service,
            b.appointmentDate,
            b.appointmentTime,
            intervals,
            clinicTz
          );
          if (!allowed.ok) {
            if (allowed.reason === "weekday_not_available") {
              const dowRaw = getEnglishWeekdayLongForYmd(b.appointmentDate, clinicTz);
              const dowCap = dowRaw ? `${dowRaw.charAt(0).toUpperCase()}${dowRaw.slice(1)}` : "that day";
              if (openDaysPhrase) {
                extras.push(
                  `Booking #${bookIndex}: We're closed on ${dowCap} for ${service.serviceName}. We're open on ${openDaysPhrase}.${hoursHint} Please send a new date (YYYY-MM-DD) on one of those days.`
                );
              } else {
                extras.push(
                  `Booking #${bookIndex}: ${service.serviceName} is not offered on ${dowCap}.${hoursHint} Please choose a different date (YYYY-MM-DD) that matches our service description and hours.`
                );
              }
              continue;
            }
            if (allowed.reason === "outside_booking_hours") {
              const dur = parseDurationMinutes(service.slotDuration);
              const bookable = computeBookableStartTimes(
                service.availabilitySlots,
                dur,
                intervals,
                b.appointmentDate,
                clinicTz
              );
              const pick = pickNearestBookable(b.appointmentTime, bookable);
              if ("match" in pick) {
                b.appointmentTime = pick.match;
              } else if (pick.suggestions.length) {
                extras.push(
                  `Booking #${bookIndex}: That time is outside our available slots for ${service.serviceName} on that date.${hoursHint} Please try one of these times instead: ${pick.suggestions.join(", ")} (24h HH:MM), or pick another time inside those hours.`
                );
                continue;
              } else {
                extras.push(
                  `Booking #${bookIndex}: That time is outside our available slots for ${service.serviceName} on that date.${hoursHint} Please choose a different time within those hours (24h HH:MM).`
                );
                continue;
              }
            } else if (allowed.reason === "slot_taken") {
              const dur = parseDurationMinutes(service.slotDuration);
              const bookable = computeBookableStartTimes(
                service.availabilitySlots,
                dur,
                intervals,
                b.appointmentDate,
                clinicTz
              );
              const pick = pickNearestBookable(b.appointmentTime, bookable);
              if ("match" in pick) {
                b.appointmentTime = pick.match;
              } else if (pick.suggestions.length) {
                extras.push(
                  `Booking #${bookIndex}: That time is already booked for ${service.serviceName}.${hoursHint} Here are nearby times that are still free: ${pick.suggestions.join(", ")}. Reply with one of these (24h HH:MM) or another free slot the same day.`
                );
                continue;
              } else {
                extras.push(
                  `Booking #${bookIndex}: That time is already booked.${hoursHint} Please pick a different time on the same day, or choose another open day${openDaysPhrase ? ` (${openDaysPhrase})` : ""}.`
                );
                continue;
              }
            } else {
              extras.push(`Booking #${bookIndex}: I could not read the time. Please send it as HH:MM (24h).`);
              continue;
            }
          }

          let validated = isStartAllowedForService(
            service,
            b.appointmentDate,
            b.appointmentTime,
            intervals,
            clinicTz
          );
          if (!validated.ok) {
            extras.push(`Booking #${bookIndex}: I could not confirm that slot. Please try another time.`);
            continue;
          }

          const durationMinutes = validated.durationMinutes;

          const hasUnpaid = await appointmentService.hasUnpaidUpcomingAppointmentForPatientDoctor({
            patientUserId,
            doctorId,
            timeZone: clinicTz,
          });
          if (hasUnpaid) {
            extras.push(
              `Booking #${bookIndex}: You already have an unpaid upcoming appointment. Pay that one first (use the payment link we sent), then message us again to book another.`
            );
            continue;
          }

          try {
            const guestId = await ensureGuestUserForWhatsApp({
              phoneE164: customerPhone,
              firstName: b.patientFirstName.trim(),
              lastName: b.patientLastName?.trim() || undefined,
            });

            const patientNotes = [
              service.serviceName ? `Service: ${service.serviceName}` : "",
              `Client: ${b.patientFirstName.trim()}${b.patientLastName?.trim() ? ` ${b.patientLastName.trim()}` : ""}`,
              "Booked via WhatsApp",
            ]
              .filter(Boolean)
              .join(" | ");

            const apt = await appointmentService.createAppointment(guestId, {
              doctorId,
              appointmentDate: b.appointmentDate,
              appointmentTime: validated.normalizedTime,
              consultationMode: b.consultationMode,
              patientNotes,
              durationMinutes,
            });

            const fee = await appointmentService.getDoctorFeeAndName(doctorId);
            const session = await stripeService.createAppointmentCheckoutSession({
              amountPkr: fee.feePkr,
              doctorName: fee.doctorName,
              metadata: {
                patientId: guestId,
                doctorId,
                appointmentDate: b.appointmentDate,
                appointmentTime: validated.normalizedTime,
                consultationMode: b.consultationMode as "inperson" | "online",
                patientNotes,
                appointmentId: apt.id,
                whatsappCustomerPhone: customerPhone,
                whatsappOwnerUserId: ctx.ownerUserId,
                bookingDoctorDisplayName: `Dr. ${fee.doctorName}`,
                durationMinutes: String(durationMinutes),
              },
            });

            bookingResult = {
              success: true,
              appointmentId: apt.id,
              checkoutUrl: session.url || undefined,
              message: "pending_checkout",
            };

            extras.push(
              `Booking #${bookIndex} (${service.serviceName}): hold created — payment confirms it. Pay here: ${session.url || "(link unavailable)"}`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            extras.push(`Booking #${bookIndex}: could not complete (${msg}).`);
          }
        }
      }
    }

    if (
      patientUserId &&
      !skipCancelAndRescheduleTogether &&
      parsedIntent.reschedule?.wants &&
      (parsedIntent.reschedule.confidence ?? 0) >= CONFIDENCE_MIN
    ) {
      const r = parsedIntent.reschedule;
      const aid = resolveAppointmentIdFromMeta(meta, r.appointmentOrdinal ?? null, r.appointmentId ?? null);
      if (!aid) {
        extras.push(
          "To reschedule, first ask me to list your appointments, then say which number (or clarify which booking)."
        );
      } else if (!r.newDate || !r.newTime || !isValidYmd(r.newDate)) {
        extras.push("Reschedule: please send the new date (YYYY-MM-DD) and time (HH:MM).");
      } else if (r.newDate < todayClinic) {
        extras.push("Reschedule: the new date cannot be in the past.");
      } else {
        try {
          await appointmentService.rescheduleAppointmentForWhatsAppPatient({
            patientUserId,
            appointmentId: aid,
            newDate: r.newDate,
            newTime: r.newTime,
          });
          extras.push(
            `Rescheduled successfully to ${r.newDate} ${normalizeHm(r.newTime)}. If payment was still pending, complete payment using the link we sent earlier (or ask us for a new one).`
          );
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (String(msg).includes("more than one full day")) {
            extras.push(MODIFY_DENIED);
          } else if (String(msg).includes("already booked")) {
            extras.push(
              "That new slot is not available (it may be booked or outside hours). Please try a different time or another open day from our schedule."
            );
          } else {
            extras.push(`Reschedule: ${msg}`);
          }
        }
      }
    }

    if (
      patientUserId &&
      !skipCancelAndRescheduleTogether &&
      parsedIntent.cancel?.wants &&
      (parsedIntent.cancel.confidence ?? 0) >= CONFIDENCE_MIN
    ) {
      const c = parsedIntent.cancel;
      const aid = resolveAppointmentIdFromMeta(meta, c.appointmentOrdinal ?? null, c.appointmentId ?? null);
      if (!aid) {
        extras.push("To cancel, ask for your appointment list first, then tell me which number to cancel.");
      } else {
        try {
          await appointmentService.cancelAppointmentForWhatsAppPatient({
            patientUserId,
            appointmentId: aid,
            reason: c.reason || undefined,
          });
          extras.push("That appointment has been cancelled. If you need to book again, tell me your preferred date and time.");
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          if (String(msg).includes("more than one full day")) {
            extras.push(MODIFY_DENIED);
          } else {
            extras.push(`Cancel: ${msg}`);
          }
        }
      }
    }

    if (skipCancelAndRescheduleTogether) {
      extras.unshift(
        "You mentioned both cancelling and rescheduling in one message. Please send one request at a time so the correct appointment is updated."
      );
    }

    if (extras.length) {
      assistantReply = `${assistantReply}\n\n${extras.join("\n\n")}`;
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

    meta = {
      ...meta,
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

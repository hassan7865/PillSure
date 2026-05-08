import { eq, and, inArray } from "drizzle-orm";
import { db } from "../config/database";
import {
  chatbotPersonas,
  type ChatbotPersonaService,
} from "../schema/chatbotPersonas";
import { hospitalServiceCatalog } from "../schema/hospitalServiceCatalog";
import {
  whatsappConversations,
  type WhatsAppConversationMessage,
} from "../schema/whatsappConversations";
import { doctors } from "../schema/doctor";
import { doctorPracticeAffiliations } from "../schema/doctorPracticeAffiliations";
import { appointmentService } from "./appointment.service";
import { practiceAffiliationService } from "./practiceAffiliation.service";
import { doctorServiceCatalogService } from "./doctorServiceCatalog.service";
import { safepayService } from "./safepay.service";
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
import { mergeWeeklySchedule, isYmdOnAvailableWeekday } from "../utils/practiceSchedule.util";
import { hasAnyDiscreteHalfHourSlots } from "../utils/affiliationHalfHourSlots.util";
import type { AffiliationWeeklySchedule } from "../schema/doctorPracticeAffiliations";

const WEEKDAY_KEYS_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** Human-readable block for system prompt: discrete half-hour grid and/or daily windows. */
const formatWeeklyScheduleForPrompt = (
  weekly: AffiliationWeeklySchedule | null | undefined
): string => {
  if (!weekly) return "";
  if (hasAnyDiscreteHalfHourSlots(weekly)) {
    if (Array.isArray(weekly)) return "";
    const m = weekly.bookableHalfHourSlotsByWeekday;
    if (!m || typeof m !== "object") return "";
    const lines: string[] = [];
    for (const day of WEEKDAY_KEYS_ORDER) {
      const arr = m[day];
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const sorted = [...new Set(arr.map((x) => normalizeHm(String(x))))].sort();
      lines.push(`- ${day}: ${sorted.join(", ")}`);
    }
    return lines.join("\n");
  }
  if (Array.isArray(weekly)) {
    return weekly
      .filter((w): w is { day: string; startTime: string; endTime: string } =>
        Boolean(w?.day && w?.startTime && w?.endTime)
      )
      .map(
        (w) =>
          `- ${String(w.day).toLowerCase()}: ${normalizeHm(w.startTime)}–${normalizeHm(w.endTime)}`
      )
      .join("\n");
  }
  if (!Array.isArray(weekly) && typeof weekly === "object") {
    const w = weekly as AffiliationWeeklySchedule & {
      availableDays?: unknown;
      openingTime?: string | null;
      closingTime?: string | null;
    };
    const days = Array.isArray(w.availableDays)
      ? w.availableDays.map((d: unknown) => String(d).toLowerCase()).join(", ")
      : "";
    const open = w.openingTime?.trim();
    const close = w.closingTime?.trim();
    if (open && close) {
      return `- General window: ${days || "scheduled days"} ${normalizeHm(open)}–${normalizeHm(close)}`;
    }
  }
  return "";
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma4:latest";
const OLLAMA_FALLBACK_MODEL = process.env.OLLAMA_FALLBACK_MODEL || "llama3.1";
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 120000);

const CONFIDENCE_MIN = 70;
const BOOKING_CONFIRM_MIN = 78;

/** Hosted Checkout URLs from prior turns must not be fed back to the model or echoed — each booking gets a new session URL appended only in extras. */
const STRIPE_HOSTED_CHECKOUT_URL_RE =
  /https:\/\/checkout\.stripe\.com\/[^\s<>"')]+/gi;

const stripHostedStripeCheckoutUrls = (text: string): string => {
  if (!text) return text;
  return text
    .replace(STRIPE_HOSTED_CHECKOUT_URL_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

type GenerateContext = {
  ownerUserId: string;
  defaultDoctorId: string | null;
  allowedDoctorIds: string[] | null;
  hospitalId?: string | null;
  defaultPracticeAffiliationId?: string | null;
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

type ScopedRuntimeService = {
  doctorId: string;
  practiceAffiliationId: string;
  doctorServiceId: string;
  serviceName: string;
  durationMinutes: number;
  pricePkr: number;
};

type ScopedAffiliation = {
  id: string;
  doctorId: string;
  kind: "private" | "hospital";
  hospitalId: string | null;
};

const filterAffiliationsByContext = (
  rows: ScopedAffiliation[],
  ctx: GenerateContext
): ScopedAffiliation[] => {
  if (ctx.defaultDoctorId) {
    return rows.filter((r) => r.doctorId === ctx.defaultDoctorId && r.kind === "private");
  }
  if (ctx.hospitalId) {
    return rows.filter((r) => r.kind === "hospital" && r.hospitalId === ctx.hospitalId);
  }
  return rows;
};

type BookingInputValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "needs_explicit_confirmation"
        | "missing_datetime_mode"
        | "invalid_consultation_mode"
        | "invalid_date"
        | "not_future_slot"
        | "missing_patient_first_name"
        | "missing_service_name";
    };

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

const findDoctorServiceByNameLoose = (
  services: Array<{ serviceName: string }>,
  name: string | null | undefined
): { serviceName: string } | null => {
  if (!name?.trim()) return null;
  const q = name.trim().toLowerCase();
  const exact = services.find((s) => s.serviceName.toLowerCase() === q);
  if (exact) return exact;
  return (
    services.find(
      (s) => s.serviceName.toLowerCase().includes(q) || q.includes(s.serviceName.toLowerCase())
    ) ?? null
  );
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

const runtimeServicesToPromptBlock = (services: ScopedRuntimeService[]): string => {
  if (!services.length) return "No services configured yet.";
  const merged = new Map<
    string,
    { serviceName: string; durationMinutes: number; minPricePkr: number; doctorCount: number }
  >();
  for (const row of services) {
    const key = row.serviceName.trim().toLowerCase();
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, {
        serviceName: row.serviceName,
        durationMinutes: row.durationMinutes,
        minPricePkr: row.pricePkr,
        doctorCount: 1,
      });
      continue;
    }
    prev.durationMinutes = Math.min(prev.durationMinutes, row.durationMinutes);
    prev.minPricePkr = Math.min(prev.minPricePkr, row.pricePkr);
    prev.doctorCount += 1;
  }
  return [...merged.values()]
    .sort((a, b) => a.serviceName.localeCompare(b.serviceName))
    .map(
      (s) =>
        `- ${s.serviceName}: duration_minutes: ${s.durationMinutes} | price_from_pkr: ${s.minPricePkr} | available_with_doctors: ${s.doctorCount}`
    )
    .join("\n");
};

const findRuntimeServicesByNameLoose = (
  services: ScopedRuntimeService[],
  name: string | null | undefined
): ScopedRuntimeService[] => {
  if (!services.length) return [];
  if (!name?.trim()) return [];
  const q = name.trim().toLowerCase();
  const exact = services.filter((s) => s.serviceName.toLowerCase() === q);
  if (exact.length) return exact;
  return services.filter(
    (s) => s.serviceName.toLowerCase().includes(q) || q.includes(s.serviceName.toLowerCase())
  );
};

const mapBookingErrorToUserText = (msg: string): string => {
  const normalized = (msg || "").toLowerCase();
  if (normalized.includes("outside") || normalized.includes("working hours")) {
    return "slot_outside_affiliation_hours: that time is outside working hours for the selected practice. Please choose another slot.";
  }
  if (normalized.includes("already booked") || normalized.includes("unavailable during that time")) {
    return "slot_conflict: that slot is no longer available. Please choose another time.";
  }
  if (normalized.includes("unpaid upcoming appointment")) {
    return "unpaid_upcoming_block: please clear your pending payment first, then request a new booking.";
  }
  if (normalized.includes("more than one full day")) {
    return "policy_block_modify_window: this request is too close to appointment time for WhatsApp changes.";
  }
  return `could not complete (${msg}).`;
};

const WEEKDAY_RE =
  /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b,\s*(\d{4}-\d{2}-\d{2})/gi;

const alignWeekdayLabelsWithYmd = (text: string, clinicTz: string): string =>
  text.replace(WEEKDAY_RE, (_full, _weekday, ymd) => {
    const wd = getEnglishWeekdayLongForYmd(String(ymd), clinicTz);
    if (!wd) return `${_weekday}, ${ymd}`;
    return `${wd.charAt(0).toUpperCase()}${wd.slice(1)}, ${ymd}`;
  });

const validateBookingInput = (params: {
  confidence: number;
  explicitlyConfirmed: boolean;
  appointmentDate: string | null | undefined;
  appointmentTime: string | null | undefined;
  consultationMode: string | null | undefined;
  patientFirstName: string | null | undefined;
  serviceName: string | null | undefined;
  clinicTz: string;
}): BookingInputValidationResult => {
  if (!params.explicitlyConfirmed || params.confidence < BOOKING_CONFIRM_MIN) {
    return { ok: false, code: "needs_explicit_confirmation" };
  }
  if (!params.appointmentDate || !params.appointmentTime || !params.consultationMode) {
    return { ok: false, code: "missing_datetime_mode" };
  }
  if (!["inperson", "online"].includes(String(params.consultationMode))) {
    return { ok: false, code: "invalid_consultation_mode" };
  }
  if (!isValidYmd(params.appointmentDate)) {
    return { ok: false, code: "invalid_date" };
  }
  if (!isStrictlyFutureAppointment(params.appointmentDate, params.appointmentTime, params.clinicTz)) {
    return { ok: false, code: "not_future_slot" };
  }
  if (!params.patientFirstName?.trim()) {
    return { ok: false, code: "missing_patient_first_name" };
  }
  if (!params.serviceName?.trim()) {
    return { ok: false, code: "missing_service_name" };
  }
  return { ok: true };
};

const isLikelyNewBookingRequest = (text: string): boolean => {
  const s = (text || "").toLowerCase();
  if (!s.trim()) return false;
  const wantsBook =
    /\b(book|booking|reserve|appointment|schedule)\b/.test(s) &&
    /\b(another|new|next|book)\b/.test(s);
  const explicitList = /\b(list|show|see|upcoming|my bookings|my appointments)\b/.test(s);
  return wantsBook && !explicitList;
};

const normalizeDoctorCandidateList = (ids: string[]): string[] => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const v = String(id || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(v)) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
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
      lines.push(`Assistant: ${stripHostedStripeCheckoutUrls(msg.response)}`);
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
  private async getScopedDoctorCandidates(ctx: GenerateContext): Promise<string[]> {
    if (ctx.defaultDoctorId) {
      return [ctx.defaultDoctorId];
    }
    if (ctx.allowedDoctorIds?.length) {
      return normalizeDoctorCandidateList(ctx.allowedDoctorIds);
    }
    if (!ctx.hospitalId) {
      return [];
    }

    const affRows = await db
      .select({ doctorId: doctorPracticeAffiliations.doctorId })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          eq(doctorPracticeAffiliations.kind, "hospital"),
          eq(doctorPracticeAffiliations.hospitalId, ctx.hospitalId),
          eq(doctorPracticeAffiliations.status, "active")
        )
      );

    return normalizeDoctorCandidateList(affRows.map((r) => r.doctorId));
  }

  private async resolveScopedAffiliations(
    ctx: GenerateContext,
    doctorCandidates: string[]
  ): Promise<ScopedAffiliation[]> {
    if (!doctorCandidates.length) return [];
    const rows = await db
      .select({
        id: doctorPracticeAffiliations.id,
        doctorId: doctorPracticeAffiliations.doctorId,
        kind: doctorPracticeAffiliations.kind,
        hospitalId: doctorPracticeAffiliations.hospitalId,
      })
      .from(doctorPracticeAffiliations)
      .where(
        and(
          inArray(doctorPracticeAffiliations.doctorId, doctorCandidates),
          eq(doctorPracticeAffiliations.status, "active")
        )
      );

    return filterAffiliationsByContext(
      rows.map((r) => ({
        id: r.id,
        doctorId: r.doctorId,
        kind: (r.kind === "hospital" ? "hospital" : "private") as "private" | "hospital",
        hospitalId: r.hospitalId,
      })),
      ctx
    );
  }

  private async resolveScopedRuntimeServices(
    scopedAffiliations: ScopedAffiliation[]
  ): Promise<ScopedRuntimeService[]> {
    const out: ScopedRuntimeService[] = [];
    for (const aff of scopedAffiliations) {
      const rows = await doctorServiceCatalogService.listActiveForScope(aff.doctorId, aff.id);
      for (const row of rows) {
        out.push({
          doctorId: aff.doctorId,
          practiceAffiliationId: aff.id,
          doctorServiceId: row.id,
          serviceName: row.serviceName,
          durationMinutes: Number(row.durationMinutes || 30),
          pricePkr: Number(row.pricePkr || 0),
        });
      }
    }
    return out;
  }

  private async buildScopedLiveSchedulePromptBlock(
    scopedAffiliations: ScopedAffiliation[]
  ): Promise<string> {
    if (!scopedAffiliations.length) return "";
    const ids = scopedAffiliations.map((a) => a.id);
    const rows = await db
      .select({
        id: doctorPracticeAffiliations.id,
        kind: doctorPracticeAffiliations.kind,
        weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
      })
      .from(doctorPracticeAffiliations)
      .where(inArray(doctorPracticeAffiliations.id, ids));

    const parts: string[] = [];
    for (const r of rows) {
      const label = r.kind === "hospital" ? "Hospital practice site" : "Private practice site";
      const body = formatWeeklyScheduleForPrompt((r.weeklySchedule as AffiliationWeeklySchedule | null) ?? null);
      if (body.trim()) {
        parts.push(`${label}:\n${body}`);
      }
    }
    return parts.join("\n\n");
  }

  private async computeBookableStartsForScopedAffiliation(params: {
    practiceAffiliationId: string;
    doctorId: string;
    ymd: string;
    clinicTz: string;
  }): Promise<string[]> {
    const [affRows, docRows] = await Promise.all([
      db
        .select({ weeklySchedule: doctorPracticeAffiliations.weeklySchedule })
        .from(doctorPracticeAffiliations)
        .where(eq(doctorPracticeAffiliations.id, params.practiceAffiliationId))
        .limit(1),
      db
        .select({
          availableDays: doctors.availableDays,
          openingTime: doctors.openingTime,
          closingTime: doctors.closingTime,
        })
        .from(doctors)
        .where(eq(doctors.id, params.doctorId))
        .limit(1),
    ]);
    if (!affRows.length || !docRows.length) return [];
    const weekly = (affRows[0].weeklySchedule as AffiliationWeeklySchedule | null) ?? null;
    const doc = docRows[0];
    const merged = mergeWeeklySchedule(weekly, doc);
    if (!isYmdOnAvailableWeekday(params.ymd, merged.availableDays, params.clinicTz)) {
      return [];
    }
    if (!hasAnyDiscreteHalfHourSlots(weekly) || Array.isArray(weekly) || !weekly?.bookableHalfHourSlotsByWeekday) {
      return [];
    }
    const wd = getEnglishWeekdayLongForYmd(params.ymd, params.clinicTz);
    if (!wd) return [];
    const arr = weekly.bookableHalfHourSlotsByWeekday[wd];
    if (!Array.isArray(arr) || arr.length === 0) return [];
    return [...new Set(arr.map((s) => normalizeHm(String(s))))].sort();
  }

  private async resolveHospitalCatalogFallback(ctx: GenerateContext): Promise<ChatbotPersonaService[]> {
    if (!ctx.hospitalId) return [];
    const rows = await db
      .select({
        serviceName: hospitalServiceCatalog.serviceName,
        description: hospitalServiceCatalog.description,
        durationMinutes: hospitalServiceCatalog.durationMinutes,
        rate: hospitalServiceCatalog.rate,
        currency: hospitalServiceCatalog.currency,
      })
      .from(hospitalServiceCatalog)
      .where(
        and(
          eq(hospitalServiceCatalog.hospitalId, ctx.hospitalId),
          eq(hospitalServiceCatalog.isActive, true)
        )
      );
    return rows.map((r) => ({
      serviceName: r.serviceName,
      description: r.description || "",
      slotDuration: String(r.durationMinutes || 30),
      price: Number(r.rate || 0),
      currency: (r.currency || "PKR").toUpperCase(),
      availabilitySlots: [],
    }));
  }

  private async resolveAvailableServiceNamesForDate(
    runtimeServices: ScopedRuntimeService[],
    ymd: string,
    clinicTz: string
  ): Promise<string[]> {
    if (!runtimeServices.length || !isValidYmd(ymd)) return [];
    const uniqueAffIds = [...new Set(runtimeServices.map((s) => s.practiceAffiliationId))];
    const uniqueDoctorIds = [...new Set(runtimeServices.map((s) => s.doctorId))];
    if (!uniqueAffIds.length || !uniqueDoctorIds.length) return [];

    const [affRows, docRows] = await Promise.all([
      db
        .select({
          id: doctorPracticeAffiliations.id,
          doctorId: doctorPracticeAffiliations.doctorId,
          weeklySchedule: doctorPracticeAffiliations.weeklySchedule,
        })
        .from(doctorPracticeAffiliations)
        .where(inArray(doctorPracticeAffiliations.id, uniqueAffIds)),
      db
        .select({
          id: doctors.id,
          availableDays: doctors.availableDays,
          openingTime: doctors.openingTime,
          closingTime: doctors.closingTime,
        })
        .from(doctors)
        .where(inArray(doctors.id, uniqueDoctorIds)),
    ]);

    const affById = new Map(affRows.map((r) => [r.id, r]));
    const docById = new Map(docRows.map((r) => [r.id, r]));
    const weekday = getEnglishWeekdayLongForYmd(ymd, clinicTz);
    if (!weekday) return [];

    const available = new Set<string>();
    for (const row of runtimeServices) {
      const aff = affById.get(row.practiceAffiliationId);
      const doc = docById.get(row.doctorId);
      if (!aff || !doc) continue;
      const weekly = (aff.weeklySchedule as AffiliationWeeklySchedule | null) ?? null;
      const merged = mergeWeeklySchedule(weekly, doc);
      if (!isYmdOnAvailableWeekday(ymd, merged.availableDays, clinicTz)) continue;

      if (hasAnyDiscreteHalfHourSlots(weekly)) {
        if (Array.isArray(weekly) || !weekly?.bookableHalfHourSlotsByWeekday) continue;
        const daySlots = weekly.bookableHalfHourSlotsByWeekday[weekday];
        if (!Array.isArray(daySlots) || daySlots.length === 0) continue;
      }
      available.add(row.serviceName);
    }
    return [...available].sort((a, b) => a.localeCompare(b));
  }

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
    const scopedDoctors = await this.getScopedDoctorCandidates(ctx);
    const scopedAffiliations = await this.resolveScopedAffiliations(ctx, scopedDoctors);
    const runtimeScopedServices = await this.resolveScopedRuntimeServices(scopedAffiliations);
    const personaServices = (persona.services as ChatbotPersonaService[]) || [];
    const hospitalCatalogFallback =
      !runtimeScopedServices.length && !personaServices.length
        ? await this.resolveHospitalCatalogFallback(ctx)
        : [];
    const promptServiceBlock = runtimeScopedServices.length
      ? runtimeServicesToPromptBlock(runtimeScopedServices)
      : servicesToPromptBlock(personaServices.length ? personaServices : hospitalCatalogFallback);

    const liveScheduleFacts = await this.buildScopedLiveSchedulePromptBlock(scopedAffiliations);

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
${promptServiceBlock}

${
  liveScheduleFacts.trim()
    ? `LIVE_SCHEDULE (clinic TZ ${clinicTz}) — authoritative bookable times for this WhatsApp line; use only these when suggesting slots. If this block is non-empty, never tell the patient that live slot data is unavailable or unloaded — quote the relevant weekday line(s) and HH:mm starts.\n${liveScheduleFacts}\n`
    : ""
}
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
        out.push({
          role: "assistant",
          content: stripHostedStripeCheckoutUrls(msg.response),
        });
      }
      return out;
    });

    let assistantReply = await callOllamaChat(
      [{ role: "system", content: systemPrompt }, ...conversationMessages, { role: "user", content: userMessage }],
      { temperature: 0.72, numPredict: 900 }
    );

    assistantReply = stripHostedStripeCheckoutUrls((assistantReply || "").trim());
    assistantReply = alignWeekdayLabelsWithYmd(assistantReply, clinicTz);

    if (!assistantReply) {
      assistantReply = "I could not process that just now. Could you please repeat your request?";
    }

    let bookingResult: ChatbotGenerateResult["bookingResult"];
    const extras: string[] = [];
    const requestedYmds = extractYmdsFromTexts([userMessage]);
    for (const ymd of requestedYmds) {
      if (!isValidYmd(ymd)) continue;
      const availableNames = await this.resolveAvailableServiceNamesForDate(
        runtimeScopedServices,
        ymd,
        clinicTz
      );
      if (runtimeScopedServices.length > 0 && availableNames.length === 0) {
        const wd = getEnglishWeekdayLongForYmd(ymd, clinicTz);
        const titleWd = wd ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)}` : "That day";
        extras.push(
          `Schedule check: no scoped services are available on ${titleWd}, ${ymd}. Please pick another date.`
        );
        assistantReply = `I checked the live schedule and there are no services available on ${titleWd}, ${ymd}. Please choose another date and I will suggest valid slots.`;
      } else if (scopedAffiliations.length === 1 && runtimeScopedServices.length > 0) {
        const aff = scopedAffiliations[0];
        const starts = await this.computeBookableStartsForScopedAffiliation({
          practiceAffiliationId: aff.id,
          doctorId: aff.doctorId,
          ymd,
          clinicTz,
        });
        if (starts.length) {
          const wd = getEnglishWeekdayLongForYmd(ymd, clinicTz);
          const titleWd = wd ? `${wd.charAt(0).toUpperCase()}${wd.slice(1)}` : ymd;
          extras.push(
            `Verified 30-minute bookable start times on ${titleWd} ${ymd} (clinic TZ ${clinicTz}, reply with HH:MM): ${starts.join(", ")}`
          );
        }
      }
    }

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
- If unsure between list vs book, prefer lower confidence so the assistant can clarify.
- If user says they want to book another/new appointment, prefer books over listAppointments unless they explicitly ask to show/list their existing bookings.`;

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
    const bookingHigh =
      (parsedIntent.books && parsedIntent.books.some((b) => (b.confidence ?? 0) >= CONFIDENCE_MIN)) || false;
    let skipCancelAndRescheduleTogether = false;
    if (cancelHigh && rescheduleHigh) {
      skipCancelAndRescheduleTogether = true;
    }

    const prevMeta = (convRows[0]?.metadata as Record<string, unknown>) || {};
    let meta: Record<string, unknown> = { ...prevMeta };

    const forceBookingMode = isLikelyNewBookingRequest(userMessage);

    const needsPatient =
      (parsedIntent.listAppointments?.wants &&
        (parsedIntent.listAppointments?.confidence ?? 0) >= CONFIDENCE_MIN) ||
      (parsedIntent.books && parsedIntent.books.some((b) => (b.confidence ?? 0) >= CONFIDENCE_MIN)) ||
      (parsedIntent.reschedule?.wants && (parsedIntent.reschedule?.confidence ?? 0) >= CONFIDENCE_MIN) ||
      (parsedIntent.cancel?.wants && (parsedIntent.cancel?.confidence ?? 0) >= CONFIDENCE_MIN);
    const listIntentHighRaw =
      (parsedIntent.listAppointments?.wants &&
        (parsedIntent.listAppointments?.confidence ?? 0) >= CONFIDENCE_MIN) ||
      false;
    const listIntentHigh =
      listIntentHighRaw && !forceBookingMode && !bookingHigh && !cancelHigh && !rescheduleHigh;

    let patientUserId: string | null = null;
    if (needsPatient) {
      patientUserId = await ensureGuestUserForWhatsApp({
        phoneE164: customerPhone,
        firstName: undefined,
        lastName: undefined,
      });
    }

    const doctorFilter = ctx.defaultDoctorId || undefined;
    const allowedDocs = scopedDoctors.length ? scopedDoctors : ctx.allowedDoctorIds;
    const allowedAffiliationIds = scopedAffiliations.length
      ? scopedAffiliations.map((a) => a.id)
      : null;
    const scopeMode =
      ctx.defaultDoctorId ? "doctor_private" : ctx.hospitalId ? "hospital" : null;

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
          allowedPracticeAffiliationIds: allowedAffiliationIds,
          scopeMode,
          scopeDoctorId: ctx.defaultDoctorId ?? null,
          scopeHospitalId: ctx.hospitalId ?? null,
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

    // For appointment list requests, always respond using verified backend rows only.
    if (listIntentHigh) {
      assistantReply = "Here are your upcoming appointments from our system:";
    }

    if (patientUserId && parsedIntent.books?.length) {
      const doctorCandidates = scopedDoctors;
      if (!doctorCandidates.length) {
        extras.push("I could not find an active doctor scope for this WhatsApp number yet. Please contact support to complete setup.");
        bookingResult = { success: false, message: "no_doctor" };
      } else {
        const uniqueServiceNames = [
          ...new Set(
            runtimeScopedServices
              .map((s) => s.serviceName.trim())
              .filter(Boolean)
              .sort((a, b) => a.localeCompare(b))
          ),
        ];
        const serviceListText = uniqueServiceNames.length
          ? uniqueServiceNames.join(", ")
          : "no active services";
        let bookIndex = 0;
        for (const b of parsedIntent.books) {
          bookIndex += 1;
          if ((b.confidence ?? 0) < CONFIDENCE_MIN) continue;
          const validation = validateBookingInput({
            confidence: b.confidence ?? 0,
            explicitlyConfirmed: Boolean(b.explicitlyConfirmed),
            appointmentDate: b.appointmentDate,
            appointmentTime: b.appointmentTime,
            consultationMode: b.consultationMode,
            patientFirstName: b.patientFirstName,
            serviceName: b.serviceName,
            clinicTz,
          });
          if (!validation.ok) {
            if (validation.code === "needs_explicit_confirmation") {
              extras.push(
                `Booking #${bookIndex}: I need everything confirmed first: service, date, time, online or in-person, your first name, and a clear "yes, book it" before I can reserve a slot.`
              );
            } else if (validation.code === "missing_datetime_mode") {
              extras.push(`Booking #${bookIndex}: I still need a clear date, time, and whether you want online or in-person.`);
            } else if (validation.code === "invalid_consultation_mode") {
              extras.push(`Booking #${bookIndex}: Please say if you prefer an online or in-person visit.`);
            } else if (validation.code === "invalid_date") {
              extras.push(`Booking #${bookIndex}: The date did not look valid. Please use YYYY-MM-DD.`);
            } else if (validation.code === "not_future_slot") {
              extras.push(
                `Booking #${bookIndex}: Appointments must be in the future. Pick a later date or time.`
              );
            } else if (validation.code === "missing_patient_first_name") {
              extras.push(`Booking #${bookIndex}: What first name should I put on the booking?`);
            } else if (validation.code === "missing_service_name") {
              extras.push(
                `Booking #${bookIndex}: Please confirm the exact service name first. Available services in this scope: ${serviceListText}.`
              );
            }
            continue;
          }
          const bookingDate = b.appointmentDate as string;
          const bookingTime = b.appointmentTime as string;
          const bookingMode = b.consultationMode as "inperson" | "online";
          const patientFirstName = b.patientFirstName as string;
          const patientLastName = b.patientLastName?.trim() || undefined;

          const hasUnpaid = await appointmentService.hasUnpaidUpcomingAppointmentForPatientDoctor({
            patientUserId,
            doctorId: null,
            timeZone: clinicTz,
          });
          if (hasUnpaid) {
            extras.push(
              `Booking #${bookIndex}: You already have an unpaid upcoming appointment. Pay that one first (use the payment link we sent), then message us again to book another.`
            );
            continue;
          }

          let doctorId: string | null = null;
          let practiceAffiliationId: string | null = null;
          let chosenService:
            | { id: string; serviceName: string; durationMinutes: number; pricePkr: unknown }
            | null = null;
          const matchedCandidates =
            findRuntimeServicesByNameLoose(runtimeScopedServices, b.serviceName || null) ||
            [];
          const resolvedCandidates =
            matchedCandidates.length === 0 && uniqueServiceNames.length === 1
              ? runtimeScopedServices.filter((s) => s.serviceName.trim() === uniqueServiceNames[0])
              : matchedCandidates;
          if (!resolvedCandidates.length) {
            extras.push(
              `Booking #${bookIndex}: I could not match that service in this scope. Please choose one of: ${serviceListText}.`
            );
            continue;
          }

          for (const candidate of resolvedCandidates) {
            try {
              await practiceAffiliationService.assertAffiliationAllowsBooking({
                doctorId: candidate.doctorId,
                practiceAffiliationId: candidate.practiceAffiliationId,
                appointmentDate: bookingDate,
                appointmentTime: bookingTime,
                durationMinutes: Number(candidate.durationMinutes || 30),
              });
              await appointmentService.assertSlotAvailable(
                candidate.doctorId,
                bookingDate,
                bookingTime,
                { durationMinutes: Number(candidate.durationMinutes || 30) }
              );
              doctorId = candidate.doctorId;
              practiceAffiliationId = candidate.practiceAffiliationId;
              chosenService = {
                id: candidate.doctorServiceId,
                serviceName: candidate.serviceName,
                durationMinutes: candidate.durationMinutes,
                pricePkr: candidate.pricePkr,
              };
              break;
            } catch {
              continue;
            }
          }

          if (!doctorId || !practiceAffiliationId || !chosenService) {
            extras.push(
              `Booking #${bookIndex}: I could not find an available doctor/service slot in this scope at that date and time. Please choose another time or service.`
            );
            continue;
          }

          const durationMinutes = Number(chosenService.durationMinutes || 30);

          try {
            const guestId = await ensureGuestUserForWhatsApp({
              phoneE164: customerPhone,
              firstName: patientFirstName.trim(),
              lastName: patientLastName,
            });

            const patientNotes = [
              chosenService.serviceName ? `Service: ${chosenService.serviceName}` : "",
              `Client: ${patientFirstName.trim()}${patientLastName ? ` ${patientLastName}` : ""}`,
              "Booked via WhatsApp",
            ]
              .filter(Boolean)
              .join(" | ");

            const apt = await appointmentService.createAppointment(guestId, {
              doctorId,
              practiceAffiliationId,
              doctorServiceId: chosenService.id,
              appointmentDate: bookingDate,
              appointmentTime: normalizeHm(bookingTime),
              consultationMode: bookingMode,
              patientNotes,
              durationMinutes,
            });

            const doctorInfo = await appointmentService.getDoctorFeeAndName(
              doctorId,
              practiceAffiliationId
            );
            const fee = {
              doctorName: doctorInfo.doctorName,
              feePkr: Number(chosenService.pricePkr || 0),
            };
            const session = await safepayService.createAppointmentCheckoutSession({
              amountPkr: fee.feePkr,
              orderId: `apt_${apt.id}`,
            });

            bookingResult = {
              success: true,
              appointmentId: apt.id,
              checkoutUrl: session.url || undefined,
              message: "pending_checkout",
            };

            extras.push(
              `Booking #${bookIndex} (${chosenService.serviceName}) with ${fee.doctorName}: hold created — payment confirms it. Pay here: ${session.url || "(link unavailable)"}`
            );
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            extras.push(`Booking #${bookIndex}: ${mapBookingErrorToUserText(msg)}`);
          }
        }
      }
    }

    // For booking requests, keep final wording anchored to verified backend outcome (extras),
    // so model text cannot incorrectly claim success/failure.
    if (bookingHigh) {
      const bookingSucceeded = extras.some((x) => /hold created/i.test(x));
      if (bookingSucceeded) {
        assistantReply = "Your booking request has been processed. Please use the verified details below:";
      } else {
        assistantReply = "I checked your booking request. Please follow the verified update below:";
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

export const __agenticChatbotTestables = {
  runtimeServicesToPromptBlock,
  findRuntimeServicesByNameLoose,
  mapBookingErrorToUserText,
  validateBookingInput,
  alignWeekdayLabelsWithYmd,
  filterAffiliationsByContext,
  formatWeeklyScheduleForPrompt,
  isLikelyNewBookingRequest,
};

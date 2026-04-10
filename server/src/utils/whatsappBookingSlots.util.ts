import type { ChatbotPersonaService, ChatbotServiceSlot } from "../schema/chatbotPersonas";
import { getEnglishWeekdayLongForYmd, normalizeHm } from "./clinicTime.util";

export const parseDurationMinutes = (slotDuration: string | undefined | null): number => {
  if (slotDuration == null || String(slotDuration).trim() === "") return 30;
  const m = String(slotDuration).match(/(\d+)/);
  if (!m) return 30;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 24 * 60) return 30;
  return n;
};

export const hmToMinutes = (hm: string): number | null => {
  const n = normalizeHm(hm);
  const [h, mi] = n.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(mi) || mi < 0 || mi > 59 || h < 0 || h > 23) {
    return null;
  }
  return h * 60 + mi;
};

export const minutesToHm = (total: number): string => {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const intervalsOverlap = (
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean => aStart < bEnd && bStart < aEnd;

/** Normalize slot day text to English lowercase full weekday, or null if empty/unknown. */
export const normalizeWeekdayKey = (raw: string | undefined | null): string | null => {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (!s) return null;
  if (s.startsWith("sun")) return "sunday";
  if (s.startsWith("mon")) return "monday";
  if (s.startsWith("thu")) return "thursday";
  if (s.startsWith("tue") || s.startsWith("tues")) return "tuesday";
  if (s.startsWith("wed")) return "wednesday";
  if (s.startsWith("fri")) return "friday";
  if (s.startsWith("sat")) return "saturday";
  if (s === "t" || s.length < 3) return null;
  const full = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const hit = full.find((w) => w === s || w.startsWith(s));
  return hit ?? null;
};

/**
 * When any slot has `day` set, only wildcard slots (no day) + slots matching the appointment weekday apply.
 * If only day-specific slots exist and none match, weekday is not offered.
 */
export const filterSlotsForAppointmentYmd = (
  slots: ChatbotServiceSlot[] | undefined | null,
  appointmentYmd: string,
  clinicTimeZone: string
): { slots: ChatbotServiceSlot[]; weekdayNotOffered: boolean } => {
  const list = slots?.filter((s) => s.isAvailable !== false) ?? [];
  if (!list.length) {
    return { slots: [], weekdayNotOffered: false };
  }

  const anyDaySpecific = list.some((s) => normalizeWeekdayKey(s.day) != null);
  if (!anyDaySpecific) {
    return { slots: list, weekdayNotOffered: false };
  }

  const wd = getEnglishWeekdayLongForYmd(appointmentYmd, clinicTimeZone);
  if (!wd) {
    return { slots: [], weekdayNotOffered: true };
  }

  const hasWildcard = list.some((s) => !normalizeWeekdayKey(s.day));
  const hasMatchingDay = list.some((s) => normalizeWeekdayKey(s.day) === wd);

  if (!hasWildcard && !hasMatchingDay) {
    return { slots: [], weekdayNotOffered: true };
  }

  const effective = list.filter((s) => {
    const d = normalizeWeekdayKey(s.day);
    if (!d) return true;
    return d === wd;
  });

  return { slots: effective, weekdayNotOffered: effective.length === 0 };
};

/** Bookable start times for a given calendar date (respects per-day slots in clinic TZ). */
export const computeBookableStartTimes = (
  slots: ChatbotServiceSlot[] | undefined | null,
  durationMinutes: number,
  bookedIntervals: { startMin: number; endMin: number }[],
  appointmentYmd: string,
  clinicTimeZone: string
): string[] => {
  const { slots: list, weekdayNotOffered } = filterSlotsForAppointmentYmd(
    slots,
    appointmentYmd,
    clinicTimeZone
  );
  if (weekdayNotOffered || !list.length) {
    return [];
  }
  const dur = Math.max(5, Math.min(durationMinutes, 24 * 60));
  const starts = new Set<string>();
  for (const slot of list) {
    const ws = hmToMinutes(slot.startTime);
    const we = hmToMinutes(slot.endTime);
    if (ws == null || we == null || we <= ws) continue;
    for (let t = ws; t + dur <= we; t += dur) {
      const end = t + dur;
      const clash = bookedIntervals.some((b) => intervalsOverlap(t, end, b.startMin, b.endMin));
      if (!clash) starts.add(minutesToHm(t));
    }
  }
  return [...starts].sort();
};

export const isStartAllowedForService = (
  service: ChatbotPersonaService,
  appointmentYmd: string,
  appointmentTimeHm: string,
  bookedIntervals: { startMin: number; endMin: number }[],
  clinicTimeZone: string
): { ok: true; durationMinutes: number; normalizedTime: string } | { ok: false; reason: string } => {
  const durationMinutes = parseDurationMinutes(service.slotDuration);
  const hm = normalizeHm(appointmentTimeHm);
  const start = hmToMinutes(hm);
  if (start == null) {
    return { ok: false, reason: "invalid_time" };
  }
  const end = start + durationMinutes;

  const { slots, weekdayNotOffered } = filterSlotsForAppointmentYmd(
    service.availabilitySlots,
    appointmentYmd,
    clinicTimeZone
  );

  if (weekdayNotOffered) {
    return { ok: false, reason: "weekday_not_available" };
  }

  if ((service.availabilitySlots?.filter((s) => s.isAvailable !== false).length ?? 0) > 0 && !slots.length) {
    return { ok: false, reason: "weekday_not_available" };
  }

  if (slots.length) {
    let inside = false;
    for (const slot of slots) {
      const ws = hmToMinutes(slot.startTime);
      const we = hmToMinutes(slot.endTime);
      if (ws == null || we == null || we <= ws) continue;
      if (start >= ws && end <= we) {
        inside = true;
        break;
      }
    }
    if (!inside) {
      return { ok: false, reason: "outside_booking_hours" };
    }
  }

  const clash = bookedIntervals.some((b) => intervalsOverlap(start, end, b.startMin, b.endMin));
  if (clash) {
    return { ok: false, reason: "slot_taken" };
  }
  return { ok: true, durationMinutes, normalizedTime: hm };
};

export const pickNearestBookable = (
  requestedHm: string,
  bookable: string[]
): { match: string } | { suggestions: string[] } => {
  if (!bookable.length) {
    return { suggestions: [] };
  }
  const req = hmToMinutes(requestedHm);
  if (req == null) {
    return { suggestions: bookable.slice(0, 5) };
  }
  const exact = bookable.find((b) => hmToMinutes(b) === req);
  if (exact) return { match: exact };
  let best = bookable[0];
  let bestD = Infinity;
  for (const b of bookable) {
    const bm = hmToMinutes(b);
    if (bm == null) continue;
    const d = Math.abs(bm - req);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  const idx = bookable.indexOf(best);
  const suggestions = bookable.slice(Math.max(0, idx - 1), idx + 4).slice(0, 5);
  return { suggestions };
};

const WEEK_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const titleCaseWeekday = (lower: string): string =>
  lower ? `${lower.charAt(0).toUpperCase()}${lower.slice(1)}` : "";

/** Comma-separated open days from day-specific slots; null if every slot is "any day". */
export const summarizeOfferedWeekdaysFromSlots = (
  slots: ChatbotServiceSlot[] | undefined | null
): string | null => {
  const list = slots?.filter((s) => s.isAvailable !== false) ?? [];
  const keys = new Set<string>();
  for (const s of list) {
    const k = normalizeWeekdayKey(s.day);
    if (k) keys.add(k);
  }
  if (keys.size === 0) {
    return null;
  }
  const ordered = WEEK_ORDER.filter((w) => keys.has(w)).map((w) => titleCaseWeekday(w));
  if (ordered.length === 0) {
    return null;
  }
  if (ordered.length === 1) {
    return ordered[0];
  }
  if (ordered.length === 2) {
    return `${ordered[0]} and ${ordered[1]}`;
  }
  return `${ordered.slice(0, -1).join(", ")}, and ${ordered[ordered.length - 1]}`;
};

/** Deduped start–end windows from slots, for short user hints. */
export const summarizeHoursWindowsFromSlots = (
  slots: ChatbotServiceSlot[] | undefined | null
): string | null => {
  const list = slots?.filter((s) => s.isAvailable !== false) ?? [];
  if (!list.length) {
    return null;
  }
  const parts = list.map((s) => {
    const a = (s.startTime || "").trim() || "?";
    const b = (s.endTime || "").trim() || "?";
    return `${a}–${b}`;
  });
  const uniq = [...new Set(parts)];
  if (uniq.length === 1) {
    return uniq[0];
  }
  if (uniq.length <= 3) {
    return uniq.join("; ");
  }
  return `${uniq.slice(0, 2).join("; ")}; …`;
};

export const findServiceByNameLoose = (
  services: ChatbotPersonaService[] | null | undefined,
  name: string | null | undefined
): ChatbotPersonaService | null => {
  if (!name?.trim() || !services?.length) return null;
  const q = name.trim().toLowerCase();
  const exact = services.find((s) => s.serviceName.toLowerCase() === q);
  if (exact) return exact;
  return services.find((s) => s.serviceName.toLowerCase().includes(q) || q.includes(s.serviceName.toLowerCase())) ?? null;
};

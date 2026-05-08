import type { AffiliationWeeklySchedule } from "../schema/doctorPracticeAffiliations";
import type { DoctorScheduleFallback } from "./practiceSchedule.util";
import { normalizeHm } from "./clinicTime.util";
import { hmToMinutes } from "./whatsappBookingSlots.util";

export const HALF_HOUR_BOOKING_MINUTES = 30;

/** Normalize onboarding / API weekday strings to long English lowercase (matches booking TZ weekday). */
export const normalizeDoctorWeekdayToLongLower = (raw: string): string | null => {
  const s = String(raw).trim().toLowerCase();
  const longDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  if ((longDays as readonly string[]).includes(s)) {
    return s;
  }
  const map: Record<string, string> = {
    sun: "sunday",
    sunday: "sunday",
    mon: "monday",
    monday: "monday",
    tue: "tuesday",
    tues: "tuesday",
    tuesday: "tuesday",
    wed: "wednesday",
    weds: "wednesday",
    wednesday: "wednesday",
    thu: "thursday",
    thur: "thursday",
    thurs: "thursday",
    thursday: "thursday",
    fri: "friday",
    friday: "friday",
    sat: "saturday",
    saturday: "saturday",
  };
  return map[s] ?? null;
};

export const generateHalfHourStartsBetween = (openHm: string | null, closeHm: string | null): string[] => {
  if (!openHm || !closeHm) return [];
  const open = hmToMinutes(normalizeHm(openHm));
  const close = hmToMinutes(normalizeHm(closeHm));
  if (open == null || close == null || close <= open) return [];
  const out: string[] = [];
  for (let t = open; t < close; t += HALF_HOUR_BOOKING_MINUTES) {
    const h = Math.floor(t / 60);
    const m = t % 60;
    out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
  return out;
};

/** Lowercase weekday long name (e.g. monday) -> HH:mm slot starts from doctor profile hours. */
export const buildDoctorBaseHalfHourSlotsByWeekday = (doc: DoctorScheduleFallback): Record<string, string[]> => {
  const rawDays = Array.isArray(doc.availableDays)
    ? (doc.availableDays as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const days = [...new Set(rawDays.map((d) => normalizeDoctorWeekdayToLongLower(d)).filter((x): x is string => x !== null))];
  const slots = generateHalfHourStartsBetween(doc.openingTime ?? null, doc.closingTime ?? null);
  const out: Record<string, string[]> = {};
  for (const d of days) {
    if (slots.length > 0) {
      out[d] = [...slots];
    }
  }
  return out;
};

const normSlot = (hm: string) => normalizeHm(hm);

export const hasAnyDiscreteHalfHourSlots = (ws: AffiliationWeeklySchedule | null | undefined): boolean => {
  if (Array.isArray(ws)) return false;
  const m = ws?.bookableHalfHourSlotsByWeekday;
  if (!m || typeof m !== "object") return false;
  return Object.values(m).some((arr) => Array.isArray(arr) && arr.length > 0);
};

export const validateHalfHourSlotsSubsetOfBase = (
  selectedByWeekday: Record<string, string[]>,
  baseByWeekday: Record<string, string[]>,
): string | null => {
  for (const [dayRaw, slots] of Object.entries(selectedByWeekday)) {
    if (!Array.isArray(slots)) {
      return `Invalid slot list for ${dayRaw}`;
    }
    const day = dayRaw.toLowerCase();
    const base = new Set((baseByWeekday[day] ?? []).map(normSlot));
    if (base.size === 0 && slots.length > 0) {
      return `No base availability on ${day} in your profile`;
    }
    for (const s of slots) {
      const n = normSlot(String(s));
      if (!base.has(n)) {
        return `Time ${n} on ${day} is outside your profile availability`;
      }
    }
  }
  return null;
};

type OtherAffRow = { id: string; weeklySchedule: unknown };

export const validateHalfHourSlotsDisjointFromOtherAffiliations = (
  excludeAffiliationId: string,
  proposed: Record<string, string[]>,
  others: OtherAffRow[],
): string | null => {
  const taken = new Map<string, Set<string>>();
  for (const row of others) {
    if (row.id === excludeAffiliationId) continue;
    const ws = row.weeklySchedule as AffiliationWeeklySchedule | null;
    if (!hasAnyDiscreteHalfHourSlots(ws)) continue;
    if (!ws || Array.isArray(ws) || !ws.bookableHalfHourSlotsByWeekday) continue;
    const by = ws.bookableHalfHourSlotsByWeekday;
    for (const [dayRaw, arr] of Object.entries(by)) {
      if (!Array.isArray(arr)) continue;
      const day = dayRaw.toLowerCase();
      if (!taken.has(day)) taken.set(day, new Set());
      for (const s of arr) taken.get(day)!.add(normSlot(String(s)));
    }
  }
  for (const [dayRaw, slots] of Object.entries(proposed)) {
    const day = dayRaw.toLowerCase();
    const used = taken.get(day) ?? new Set();
    for (const s of slots) {
      const n = normSlot(String(s));
      if (used.has(n)) {
        return `Time ${n} on ${day} is already assigned to another practice site`;
      }
    }
  }
  return null;
};

export const isAppointmentStartInDiscreteHalfHourSlots = (
  weekdayLower: string,
  appointmentHm: string,
  durationMinutes: number,
  ws: AffiliationWeeklySchedule | null | undefined,
): boolean => {
  if (!hasAnyDiscreteHalfHourSlots(ws)) return true;
  const day = weekdayLower.toLowerCase();
  if (!ws || Array.isArray(ws) || !ws.bookableHalfHourSlotsByWeekday) return true;
  const arr = ws.bookableHalfHourSlotsByWeekday[day];
  // When discrete slots are configured, weekdays not explicitly listed are closed.
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const set = new Set(arr.map((s) => normSlot(String(s))));
  const start = normSlot(appointmentHm);
  if (!set.has(start)) return false;
  if (durationMinutes !== HALF_HOUR_BOOKING_MINUTES) {
    return false;
  }
  return true;
};

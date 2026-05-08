import type { AffiliationWeeklySchedule } from "../schema/doctorPracticeAffiliations";
import { getEnglishWeekdayLongForYmd, getWhatsAppClinicTimeZone } from "./clinicTime.util";
import { hmToMinutes } from "./whatsappBookingSlots.util";

export type DoctorScheduleFallback = {
  availableDays: unknown;
  openingTime: string | null | undefined;
  closingTime: string | null | undefined;
};

export const mergeWeeklySchedule = (
  aff: AffiliationWeeklySchedule | null | undefined,
  doctor: DoctorScheduleFallback
): { availableDays: string[]; openingTime: string | null; closingTime: string | null } => {
  if (Array.isArray(aff)) {
    const windows = aff
      .filter((w): w is { day: string; startTime: string; endTime: string } => Boolean(w?.day && w?.startTime && w?.endTime));
    const days = [...new Set(windows.map((w) => String(w.day).toLowerCase()))];
    const starts = windows.map((w) => hmToMinutes(String(w.startTime))).filter((x): x is number => x != null);
    const ends = windows.map((w) => hmToMinutes(String(w.endTime))).filter((x): x is number => x != null);
    const openingTime =
      starts.length > 0
        ? `${String(Math.floor(Math.min(...starts) / 60)).padStart(2, "0")}:${String(Math.min(...starts) % 60).padStart(2, "0")}`
        : doctor.openingTime ?? null;
    const closingTime =
      ends.length > 0
        ? `${String(Math.floor(Math.max(...ends) / 60)).padStart(2, "0")}:${String(Math.max(...ends) % 60).padStart(2, "0")}`
        : doctor.closingTime ?? null;
    return { availableDays: days, openingTime, closingTime };
  }

  const days = Array.isArray(doctor.availableDays)
    ? (doctor.availableDays as unknown[])
        .filter((x): x is string => typeof x === "string")
        .map((d: string) => d.toLowerCase())
    : [];
  return {
    availableDays: days,
    openingTime: doctor.openingTime ?? null,
    closingTime: doctor.closingTime ?? null,
  };
};

export const isYmdOnAvailableWeekday = (
  ymd: string,
  availableDays: string[],
  timeZone: string
): boolean => {
  if (!availableDays.length) return true;
  const wd = getEnglishWeekdayLongForYmd(ymd, timeZone);
  const set = new Set(availableDays.map((d) => d.toLowerCase()));
  return set.has(wd);
};

export const isSlotWithinWindow = (
  appointmentHm: string,
  durationMinutes: number,
  openingTime: string | null,
  closingTime: string | null
): boolean => {
  if (!openingTime || !closingTime) return true;
  const open = hmToMinutes(openingTime);
  const close = hmToMinutes(closingTime);
  const start = hmToMinutes(appointmentHm);
  if (open == null || close == null || start == null) return true;
  const end = start + durationMinutes;
  return start >= open && end <= close;
};

export const defaultScheduleTimeZone = (): string => getWhatsAppClinicTimeZone();

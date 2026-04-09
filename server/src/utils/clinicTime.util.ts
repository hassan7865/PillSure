/** WhatsApp booking uses one clinic timezone for "today", calendar-day rules, and slot wording. */
export const getWhatsAppClinicTimeZone = (): string =>
  process.env.WHATSAPP_CLINIC_TIMEZONE?.trim() || "UTC";

export const getTodayYmdInTimeZone = (timeZone: string, now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** HH:MM 24h in time zone */
export const getNowHmInTimeZone = (timeZone: string, now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
};

/** Whole calendar days between appointment date and today in clinic TZ (appointmentYmd - todayYmd). */
export const calendarDaysFromTodayToAppointment = (
  appointmentYmd: string,
  todayYmd: string
): number => {
  const [ay, am, ad] = appointmentYmd.split("-").map(Number);
  const [ty, tm, td] = todayYmd.split("-").map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const t = Date.UTC(ty, tm - 1, td);
  return Math.round((a - t) / 86400000);
};

/**
 * Reschedule/cancel via WhatsApp allowed only if appointment local date is more than 1 day after today (clinic TZ).
 * Tomorrow => diff 1 => not allowed. Day-after-tomorrow => diff 2 => allowed.
 */
export const canModifyAppointmentByCalendarDayRule = (
  appointmentYmd: string,
  timeZone: string,
  now: Date = new Date()
): boolean => {
  const today = getTodayYmdInTimeZone(timeZone, now);
  return calendarDaysFromTodayToAppointment(appointmentYmd, today) > 1;
};

export const isAppointmentUpcoming = (
  appointmentYmd: string,
  appointmentHm: string,
  timeZone: string,
  now: Date = new Date()
): boolean => {
  const today = getTodayYmdInTimeZone(timeZone, now);
  if (appointmentYmd > today) return true;
  if (appointmentYmd < today) return false;
  const hm = normalizeHm(appointmentHm);
  const nowHm = getNowHmInTimeZone(timeZone, now);
  return hm >= nowHm;
};

export const normalizeHm = (raw: string): string => {
  const s = raw.trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "00:00";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return "00:00";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
};

export const isValidYmd = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Weekday for a calendar Y-M-D interpreted at noon UTC, formatted in clinic TZ (matches "Thursday" style lists). */
export const getEnglishWeekdayLongForYmd = (ymd: string, timeZone: string): string => {
  const parts = ymd.split("-").map(Number);
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  if (!y || !m || !d) return "";
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long" })
    .format(utcNoon)
    .toLowerCase();
};

/** True if appointment is strictly in the future (clinic TZ), not "now" or past. */
export const isStrictlyFutureAppointment = (
  appointmentYmd: string,
  appointmentHm: string,
  timeZone: string,
  now: Date = new Date()
): boolean => {
  const today = getTodayYmdInTimeZone(timeZone, now);
  if (appointmentYmd < today) return false;
  if (appointmentYmd > today) return true;
  const hm = normalizeHm(appointmentHm);
  const nowHm = getNowHmInTimeZone(timeZone, now);
  return hm > nowHm;
};

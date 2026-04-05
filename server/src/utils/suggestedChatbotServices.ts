import type { ChatbotPersonaService } from "../schema/chatbotPersonas";

type DoctorScheduleSlice = {
  feePkr: string | null;
  openingTime: string | null;
  closingTime: string | null;
  availableDays: unknown;
};

export const suggestedServicesFromDoctorProfile = (
  d: DoctorScheduleSlice
): ChatbotPersonaService[] => {
  const rawFee = d.feePkr;
  const priceNum =
    rawFee !== null && rawFee !== undefined && String(rawFee).trim() !== ""
      ? Number(rawFee)
      : undefined;
  const open = (d.openingTime && d.openingTime.trim()) || "09:00";
  const close = (d.closingTime && d.closingTime.trim()) || "17:00";
  const days = Array.isArray(d.availableDays)
    ? (d.availableDays as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const daysPart = days.length > 0 ? ` Typical days: ${days.join(", ")}.` : "";
  return [
    {
      serviceName: "Consultation",
      price: Number.isFinite(priceNum) ? priceNum : undefined,
      currency: "PKR",
      description: `General consultation.${daysPart}`.trim(),
      availabilitySlots: [{ startTime: open, endTime: close, isAvailable: true }],
    },
  ];
};

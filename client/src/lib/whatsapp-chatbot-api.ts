import api from "@/lib/interceptor";
import { extractApiData, extractApiDataWithFallback } from "@/lib/api-utils";

export type WhatsAppSettingsAccount = {
  id: string;
  phoneNumberId: string;
  displayPhoneNumber: string | null;
  accessTokenMasked: string;
  whatsappAppId: string;
  wabaId: string | null;
  doctorId: string | null;
  hospitalId: string | null;
  allowedDoctorIds: string[] | null;
  isSetupComplete: boolean;
};

/** Row from GET /chatbot/persona (subset used by settings UI). */
export type ChatbotPersonaDto = {
  id: string;
  businessName: string;
  ownerName: string;
  persona: string;
  services: unknown[];
  businessType?: string;
  whatsappNumber?: string | null;
};

export type WhatsAppSettingsGetResponse = {
  profileDoctorId: string | null;
  account: WhatsAppSettingsAccount | null;
};

export const whatsappSettingsApi = {
  get: async (): Promise<WhatsAppSettingsGetResponse> => {
    const res = await api.get("/settings/whatsapp");
    return extractApiData(res);
  },
  patch: async (body: Record<string, unknown>) => {
    const res = await api.patch("/settings/whatsapp", body);
    return res.data;
  },
};

/** Built from doctor onboarding (fee, hours, days) when GET user is a doctor. */
export type SuggestedChatbotService = {
  serviceName: string;
  price?: number;
  currency?: string;
  description?: string;
  availabilitySlots?: { startTime: string; endTime: string; isAvailable?: boolean }[];
};

export type ChatbotPersonaGetResponse = {
  persona: ChatbotPersonaDto | null;
  suggestedServices: SuggestedChatbotService[] | null;
};

export const chatbotPersonaApi = {
  get: async (): Promise<ChatbotPersonaGetResponse> => {
    const res = await api.get("/chatbot/persona");
    return extractApiDataWithFallback<ChatbotPersonaGetResponse>(res, {
      persona: null,
      suggestedServices: null,
    });
  },
  put: async (body: Record<string, unknown>) => {
    const res = await api.put("/chatbot/persona", body);
    return extractApiData(res);
  },
  generate: async (body: { businessName: string; ownerName: string; businessType?: string; about?: string }) => {
    const res = await api.post("/chatbot/persona/generate", body);
    return extractApiData<{ persona: string }>(res);
  },
};

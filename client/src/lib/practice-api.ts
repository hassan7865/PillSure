import api from "@/lib/interceptor";
import { extractApiData } from "@/lib/api-utils";
import type { ApiResponse } from "@/lib/types";

export type PracticeAffiliationRow = {
  id: string;
  kind: string;
  status: string;
  weeklySchedule: Record<string, unknown> | null;
  hospitalId: string | null;
  hospitalName: string | null;
  /** `org_invite` = hospital invited you (accept/decline in app). `doctor_request` = you asked to join (org approves). */
  invitationSource?: string | null;
};

export type DoctorPracticeServiceRow = {
  id: string;
  doctorId: string;
  practiceAffiliationId: string;
  serviceName: string;
  description: string | null;
  durationMinutes: number;
  pricePkr: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DoctorBaseHalfHourSlotsResponse = {
  availableDays: unknown;
  openingTime: string | null;
  closingTime: string | null;
  slotsByWeekday: Record<string, string[]>;
  /** False until onboarding has at least one day, open/close times, and a non-empty slot grid. */
  profileComplete?: boolean;
};

export const practiceApi = {
  getBaseHalfHourSlots: async (): Promise<DoctorBaseHalfHourSlotsResponse> => {
    const res = await api.get<ApiResponse<DoctorBaseHalfHourSlotsResponse>>("/doctor/practice/base-half-hour-slots");
    return extractApiData(res);
  },

  listAffiliations: async (): Promise<PracticeAffiliationRow[]> => {
    const res = await api.get<ApiResponse<PracticeAffiliationRow[]>>("/doctor/practice/affiliations");
    return extractApiData(res);
  },

  acceptOrgInvite: async (affiliationId: string): Promise<{ id: string; status: string }> => {
    const res = await api.post<ApiResponse<{ id: string; status: string }>>(
      `/doctor/practice/affiliations/${encodeURIComponent(affiliationId)}/accept-invite`,
      {},
    );
    return extractApiData(res);
  },

  rejectOrgInvite: async (affiliationId: string): Promise<{ id: string; status: string }> => {
    const res = await api.post<ApiResponse<{ id: string; status: string }>>(
      `/doctor/practice/affiliations/${encodeURIComponent(affiliationId)}/reject-invite`,
      {},
    );
    return extractApiData(res);
  },

  ensurePrivate: async (): Promise<{ id: string }> => {
    const res = await api.post<ApiResponse<{ id: string }>>("/doctor/practice/private");
    return extractApiData(res);
  },

  updateSchedule: async (affiliationId: string, weeklySchedule: Record<string, unknown>) => {
    const res = await api.patch<ApiResponse<{ id: string }>>(
      `/doctor/practice/affiliations/${encodeURIComponent(affiliationId)}/schedule`,
      { weeklySchedule },
    );
    return extractApiData(res);
  },

  requestHospital: async (hospitalId: string) => {
    const res = await api.post<ApiResponse<{ id: string }>>("/doctor/practice/request-hospital", { hospitalId });
    return extractApiData(res);
  },

  addException: async (body: {
    exceptionDate: string;
    isFullDay?: boolean;
    startTime?: string;
    endTime?: string;
    reason?: string;
    practiceAffiliationId?: string | null;
  }) => {
    const res = await api.post<ApiResponse<{ id: string }>>("/doctor/practice/availability-exceptions", body);
    return extractApiData(res);
  },

  listMyServices: async (practiceAffiliationId?: string): Promise<DoctorPracticeServiceRow[]> => {
    const query = practiceAffiliationId
      ? `?practiceAffiliationId=${encodeURIComponent(practiceAffiliationId)}`
      : "";
    const res = await api.get<ApiResponse<DoctorPracticeServiceRow[]>>(`/doctor/me/services${query}`);
    return extractApiData(res);
  },

  createMyService: async (body: {
    practiceAffiliationId: string;
    serviceName: string;
    description?: string;
    durationMinutes: number;
    pricePkr: number;
  }): Promise<DoctorPracticeServiceRow> => {
    const res = await api.post<ApiResponse<DoctorPracticeServiceRow>>("/doctor/me/services", body);
    return extractApiData(res);
  },

  deleteMyService: async (serviceId: string): Promise<{ id: string }> => {
    const res = await api.delete<ApiResponse<{ id: string }>>(`/doctor/me/services/${encodeURIComponent(serviceId)}`);
    return extractApiData(res);
  },
};

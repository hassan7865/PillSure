import api from '@/lib/interceptor';
import {
  CreateAppointmentRequest,
  UpdateAppointmentStatusRequest,
  UpdateAppointmentNotesRequest,
  ApiResponse,
  CheckoutSessionResponse,
  DoctorDashboardStats,
  HospitalDashboardStats,
  ClinicDashboardStats,
  HospitalDoctorsPayload,
  ClinicDoctorsPayload,
  HospitalDoctorAppointmentsPayload,
  HospitalDoctorOfferRow,
  HospitalOfferHistoryRow,
  HospitalDoctorOfferService,
  HospitalCatalogService,
} from './_types';
import { extractApiData, buildStatusParam, buildQueryString } from '@/lib/api-utils';

export const appointmentApi = {
  createCheckoutSession: async (data: CreateAppointmentRequest): Promise<CheckoutSessionResponse> => {
    const response = await api.post('/appointments/checkout-session', data);
    return extractApiData(response);
  },

  getPatientAppointments: async (status?: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/patient${buildStatusParam(status)}`);
    return extractApiData(response);
  },

  getCurrentDoctorAppointments: async (status?: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/doctor/appointments${buildStatusParam(status)}`);
    return extractApiData(response);
  },

  getAppointmentById: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/${id}`);
    return extractApiData(response);
  },

  updateAppointmentStatus: async (id: string, data: UpdateAppointmentStatusRequest): Promise<ApiResponse> => {
    const response = await api.put(`/appointments/${id}/status`, data);
    return extractApiData(response);
  },

  updateAppointmentNotes: async (id: string, data: UpdateAppointmentNotesRequest): Promise<ApiResponse> => {
    const response = await api.put(`/appointments/${id}/notes`, data);
    return extractApiData(response);
  },

  deleteAppointment: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/appointments/${id}`);
    return extractApiData(response);
  },

  getBookedSlots: async (doctorId: string, date: string): Promise<string[]> => {
    const response = await api.get(`/appointments/booked-slots/${doctorId}/${date}`);
    return extractApiData(response);
  },

  getCurrentDoctorYearlyStats: async (year?: number): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/doctor/yearly-stats${buildQueryString({ year })}`);
    return extractApiData(response);
  },

  getCurrentDoctorDashboardStats: async (): Promise<DoctorDashboardStats> => {
    const response = await api.get(`/appointments/doctor/dashboard-stats`);
    return extractApiData(response);
  },

  getCurrentHospitalDashboardStats: async (): Promise<HospitalDashboardStats> => {
    const response = await api.get(`/hospital/dashboard-stats`);
    return extractApiData(response);
  },

  getCurrentClinicDashboardStats: async (): Promise<ClinicDashboardStats> => {
    const response = await api.get(`/clinic/dashboard-stats`);
    return extractApiData(response);
  },

  getHospitalDoctors: async (): Promise<HospitalDoctorsPayload> => {
    const response = await api.get(`/hospital/doctors`);
    return extractApiData(response);
  },

  getHospitalDoctorAppointments: async (doctorId: string): Promise<HospitalDoctorAppointmentsPayload> => {
    const response = await api.get(`/hospital/doctors/${encodeURIComponent(doctorId)}/appointments`);
    return extractApiData(response);
  },

  getHospitalDoctorOffers: async (doctorId: string): Promise<HospitalDoctorOfferRow[]> => {
    const response = await api.get(`/hospital/doctors/${encodeURIComponent(doctorId)}/offers`);
    return extractApiData(response);
  },

  getHospitalOffersHistory: async (): Promise<HospitalOfferHistoryRow[]> => {
    const response = await api.get(`/hospital/offers`);
    return extractApiData(response);
  },

  upsertHospitalDoctorOffer: async (
    doctorId: string,
    body: { practiceAffiliationId: string; offer: HospitalDoctorOfferService },
  ): Promise<HospitalDoctorOfferRow> => {
    const response = await api.post(`/hospital/doctors/${encodeURIComponent(doctorId)}/offers`, body);
    return extractApiData(response);
  },

  listHospitalServices: async (): Promise<HospitalCatalogService[]> => {
    const response = await api.get(`/hospital/services`);
    return extractApiData(response);
  },

  createHospitalService: async (body: {
    serviceName: string;
    description?: string;
    durationMinutes: number;
    rate: number;
    currency: "PKR";
  }): Promise<HospitalCatalogService> => {
    const response = await api.post(`/hospital/services`, body);
    return extractApiData(response);
  },

  updateHospitalService: async (serviceId: string, body: {
    serviceName: string;
    description?: string;
    durationMinutes: number;
    rate: number;
    currency: "PKR";
    isActive?: boolean;
  }): Promise<HospitalCatalogService> => {
    const response = await api.patch(`/hospital/services/${encodeURIComponent(serviceId)}`, body);
    return extractApiData(response);
  },

  setHospitalServiceActive: async (serviceId: string, isActive: boolean): Promise<HospitalCatalogService> => {
    const response = await api.patch(`/hospital/services/${encodeURIComponent(serviceId)}/active`, { isActive });
    return extractApiData(response);
  },

  getClinicDoctors: async (): Promise<ClinicDoctorsPayload> => {
    const response = await api.get(`/clinic/doctors`);
    return extractApiData(response);
  },

  getClinicDoctorAppointments: async (doctorId: string): Promise<HospitalDoctorAppointmentsPayload> => {
    const response = await api.get(`/clinic/doctors/${encodeURIComponent(doctorId)}/appointments`);
    return extractApiData(response);
  },

  createHospitalDoctor: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const response = await api.post(`/hospital/doctors`, data);
    return extractApiData(response);
  },

  inviteHospitalDoctor: async (
    email: string,
  ): Promise<{ affiliationId: string; status: string; message?: string }> => {
    const response = await api.post(`/hospital/doctors/invite`, { email });
    return extractApiData(response);
  },

  patchHospitalDoctorActive: async (doctorId: string, isActive: boolean) => {
    const response = await api.patch(`/hospital/doctors/${encodeURIComponent(doctorId)}`, { isActive });
    return extractApiData(response);
  },

  patchHospitalAffiliation: async (affiliationId: string, status: string) => {
    const response = await api.patch(`/hospital/affiliations/${encodeURIComponent(affiliationId)}`, { status });
    return extractApiData(response);
  },

  createClinicDoctor: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const response = await api.post(`/clinic/doctors`, data);
    return extractApiData(response);
  },

  inviteClinicDoctor: async (
    email: string,
  ): Promise<{ affiliationId: string; status: string; message?: string }> => {
    const response = await api.post(`/clinic/doctors/invite`, { email });
    return extractApiData(response);
  },

  patchClinicDoctorActive: async (doctorId: string, isActive: boolean) => {
    const response = await api.patch(`/clinic/doctors/${encodeURIComponent(doctorId)}`, { isActive });
    return extractApiData(response);
  },

  patchClinicAffiliation: async (affiliationId: string, status: string) => {
    const response = await api.patch(`/clinic/affiliations/${encodeURIComponent(affiliationId)}`, { status });
    return extractApiData(response);
  },

  getCompletedAppointmentsByPatientId: async (patientId: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/patient/${patientId}/completed`);
    return extractApiData(response);
  },

  getPrescriptionByAppointmentId: async (appointmentId: string): Promise<any[]> => {
    const response = await api.get(`/appointments/${appointmentId}/prescription`);
    return extractApiData(response);
  },

  getDoctorOffers: async (): Promise<HospitalDoctorOfferRow[]> => {
    const response = await api.get(`/doctor/practice/offers`);
    return extractApiData(response);
  },

  acceptDoctorOffer: async (offerId: string): Promise<{ id: string; status: string }> => {
    const response = await api.post(`/doctor/practice/offers/${encodeURIComponent(offerId)}/accept`, {});
    return extractApiData(response);
  },

  recheckDoctorOfferConflicts: async (
    offerId: string,
  ): Promise<{ id: string; status: string; conflicts: unknown[]; isReadyToAccept: boolean }> => {
    const response = await api.post(
      `/doctor/practice/offers/${encodeURIComponent(offerId)}/recheck-conflicts`,
      {},
    );
    return extractApiData(response);
  },

  rejectDoctorOffer: async (offerId: string): Promise<{ id: string; status: string }> => {
    const response = await api.post(`/doctor/practice/offers/${encodeURIComponent(offerId)}/reject`, {});
    return extractApiData(response);
  },
};

export default appointmentApi;


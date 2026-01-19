import api from '@/lib/interceptor';
import { CreateAppointmentRequest, UpdateAppointmentStatusRequest, UpdateAppointmentNotesRequest ,ApiResponse} from './_types';
import { extractApiData, buildStatusParam, buildQueryString } from '@/lib/api-utils';

export const appointmentApi = {
  createAppointment: async (data: CreateAppointmentRequest): Promise<ApiResponse> => {
    const response = await api.post('/appointments', data);
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

  getCurrentDoctorAppointmentStats: async (): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/doctor/stats`);
    return extractApiData(response);
  },

  getCurrentDoctorYearlyStats: async (year?: number): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/doctor/yearly-stats${buildQueryString({ year })}`);
    return extractApiData(response);
  },

  getCompletedAppointmentsByPatientId: async (patientId: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/patient/${patientId}/completed`);
    return extractApiData(response);
  },

  getPrescriptionByAppointmentId: async (appointmentId: string): Promise<any[]> => {
    const response = await api.get(`/appointments/${appointmentId}/prescription`);
    return response.data.data;
  },
};

export default appointmentApi;


import api from '@/lib/interceptor';
import { CreateAppointmentRequest, UpdateAppointmentStatusRequest, UpdateAppointmentNotesRequest ,ApiResponse} from './_types';


export const appointmentApi = {
  createAppointment: async (data: CreateAppointmentRequest): Promise<ApiResponse> => {
    const response = await api.post('/appointments', data);
    return response.data.data;
  },

  getPatientAppointments: async (status?: string): Promise<ApiResponse> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/appointments/patient${params}`);
    return response.data.data;
  },

  getDoctorAppointments: async (doctorId: string, status?: string): Promise<ApiResponse> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get(`/appointments/doctor/${doctorId}${params}`);
    return response.data.data;
  },

  getAppointmentById: async (id: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/${id}`);
    return response.data.data;
  },

  updateAppointmentStatus: async (id: string, data: UpdateAppointmentStatusRequest): Promise<ApiResponse> => {
    const response = await api.put(`/appointments/${id}/status`, data);
    return response.data.data;
  },

  updateAppointmentNotes: async (id: string, data: UpdateAppointmentNotesRequest): Promise<ApiResponse> => {
    const response = await api.put(`/appointments/${id}/notes`, data);
    return response.data.data;
  },

  deleteAppointment: async (id: string): Promise<ApiResponse> => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data.data;
  },

  getBookedSlots: async (doctorId: string, date: string): Promise<string[]> => {
    const response = await api.get(`/appointments/booked-slots/${doctorId}/${date}`);
    return response.data.data;
  },

  getDoctorAppointmentStats: async (doctorId: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/doctor/${doctorId}/stats`);
    return response.data.data;
  },

  getDoctorYearlyStats: async (doctorId: string, year?: number): Promise<ApiResponse> => {
    const params = year ? `?year=${year}` : '';
    const response = await api.get(`/appointments/doctor/${doctorId}/yearly-stats${params}`);
    return response.data.data;
  },

  getCompletedAppointmentsByPatientId: async (patientId: string): Promise<ApiResponse> => {
    const response = await api.get(`/appointments/patient/${patientId}/completed`);
    return response.data.data;
  },
};

export default appointmentApi;


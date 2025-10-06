import api from './interceptor';
import { Doctor } from './types';

// Types for doctor API responses
export interface Specialization {
  id: number;
  name: string;
  description?: string;
}


export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
}

// Doctor API functions
export const doctorApi = {
  // Get all specializations
  getSpecializations: async (): Promise<ApiResponse<Specialization[]>> => {
    const response = await api.get('/doctor/specializations');
    return response.data;
  },

  getDoctors: async (): Promise<ApiResponse<Doctor[]>> => {
    const response = await api.get('/doctor/search-doctors');
    return response.data;
  },
};

export default doctorApi;

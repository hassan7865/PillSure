import api from './interceptor';

// Types for doctor API responses
export interface Specialization {
  id: number;
  name: string;
  description?: string;
}


export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
}

// Doctor API functions
export const doctorApi = {
  // Get all specializations
  getSpecializations: async (): Promise<ApiResponse<Specialization[]>> => {
    const response = await api.get('/doctor/specializations');
    return response.data;
  },
};

export default doctorApi;

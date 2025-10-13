import api from '@/lib/interceptor';
import { DoctorOnboardingRequest, HospitalOnboardingRequest, PatientOnboardingRequest } from './_types';



// Standardized API Response Type
export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
}

// Onboarding API functions
export const onboardingApi = {
  // Patient onboarding - handles both create and update
  savePatientOnboarding: async (data: PatientOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/patient', data);
    return response.data.data;
  },

  // Doctor onboarding - handles both create and update
  saveDoctorOnboarding: async (data: DoctorOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/doctor', data);
    return response.data.data;
  },

  // Hospital onboarding - handles both create and update
  saveHospitalOnboarding: async (data: HospitalOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/hospital', data);
    return response.data.data;
  },

  // Get saved onboarding data
  getPatientOnboarding: async (): Promise<ApiResponse> => {
    const response = await api.get('/onboarding/patient');
    return response.data.data;
  },

  getDoctorOnboarding: async (): Promise<ApiResponse> => {
    const response = await api.get('/onboarding/doctor');
    return response.data.data;
  },

  getHospitalOnboarding: async (): Promise<ApiResponse> => {
    const response = await api.get('/onboarding/hospital');
    return response.data.data;
  },

  // Update onboarding step
  updateOnboardingStep: async (step: number): Promise<ApiResponse> => {
    const response = await api.put('/onboarding/step', { step });
    return response.data.data;
  },

  // Get onboarding status
  getOnboardingStatus: async (): Promise<ApiResponse> => {
    const response = await api.get('/onboarding/status');
    return response.data.data;
  },
};

export default onboardingApi;

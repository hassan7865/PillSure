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
  // Patient onboarding
  completePatientOnboarding: async (data: PatientOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/patient', data);
    return response.data.data;
  },

  // Doctor onboarding
  completeDoctorOnboarding: async (data: DoctorOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/doctor', data);
    return response.data.data;
  },

  // Hospital onboarding
  completeHospitalOnboarding: async (data: HospitalOnboardingRequest): Promise<ApiResponse> => {
    const response = await api.post('/onboarding/hospital', data);
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

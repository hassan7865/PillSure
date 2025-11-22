import api from '@/lib/interceptor';
import { DoctorOnboardingRequest, HospitalOnboardingRequest, PatientOnboardingRequest } from './_types';
import { OnboardingResponseData } from '@/lib/types';
import { ApiResponse } from '@/lib/types';

// Onboarding API functions
export const onboardingApi = {
  // Patient onboarding - handles both create and update
  savePatientOnboarding: async (data: PatientOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/patient', data);
    return response.data.data!;
  },

  // Doctor onboarding - handles both create and update
  saveDoctorOnboarding: async (data: DoctorOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/doctor', data);
    return response.data.data!;
  },

  // Hospital onboarding - handles both create and update
  saveHospitalOnboarding: async (data: HospitalOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/hospital', data);
    return response.data.data!;
  },

  // Get saved onboarding data
  getPatientOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/patient');
    return response.data.data;
  },

  getDoctorOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/doctor');
    return response.data.data;
  },

  getHospitalOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/hospital');
    return response.data.data;
  },

  // Update onboarding step
  updateOnboardingStep: async (step: number): Promise<OnboardingResponseData> => {
    const response = await api.put<ApiResponse<OnboardingResponseData>>('/onboarding/step', { step });
    return response.data.data!;
  },

  // Get onboarding status
  getOnboardingStatus: async (): Promise<OnboardingResponseData> => {
    const response = await api.get<ApiResponse<OnboardingResponseData>>('/onboarding/status');
    return response.data.data!;
  },
};

export default onboardingApi;

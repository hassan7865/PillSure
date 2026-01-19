import api from '@/lib/interceptor';
import { DoctorOnboardingRequest, HospitalOnboardingRequest, PatientOnboardingRequest } from './_types';
import { OnboardingResponseData } from '@/lib/types';
import { ApiResponse } from '@/lib/types';
import { extractApiData } from '@/lib/api-utils';

// Onboarding API functions
export const onboardingApi = {
  // Patient onboarding - handles both create and update
  savePatientOnboarding: async (data: PatientOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/patient', data);
    return extractApiData(response);
  },

  // Doctor onboarding - handles both create and update
  saveDoctorOnboarding: async (data: DoctorOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/doctor', data);
    return extractApiData(response);
  },

  // Hospital onboarding - handles both create and update
  saveHospitalOnboarding: async (data: HospitalOnboardingRequest): Promise<OnboardingResponseData> => {
    const response = await api.post<ApiResponse<OnboardingResponseData>>('/onboarding/hospital', data);
    return extractApiData(response);
  },

  // Get saved onboarding data
  getPatientOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/patient');
    return extractApiData(response);
  },

  getDoctorOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/doctor');
    return extractApiData(response);
  },

  getHospitalOnboarding: async (): Promise<any> => {
    const response = await api.get('/onboarding/hospital');
    return extractApiData(response);
  },

  // Update onboarding step
  updateOnboardingStep: async (step: number): Promise<OnboardingResponseData> => {
    const response = await api.put<ApiResponse<OnboardingResponseData>>('/onboarding/step', { step });
    return extractApiData(response);
  },

  // Get onboarding status
  getOnboardingStatus: async (): Promise<OnboardingResponseData> => {
    const response = await api.get<ApiResponse<OnboardingResponseData>>('/onboarding/status');
    return extractApiData(response);
  },
};

export default onboardingApi;

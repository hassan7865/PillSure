import api from './interceptor';
import { 
  PatientOnboardingRequest,
  DoctorOnboardingRequest,
  HospitalOnboardingRequest,
  OnboardingResponse,
  OnboardingStatus
} from './types';

// Onboarding API functions
export const onboardingApi = {
  // Patient onboarding
  completePatientOnboarding: async (data: PatientOnboardingRequest): Promise<OnboardingResponse> => {
    const response = await api.post('/onboarding/patient', data);
    return response.data;
  },

  // Doctor onboarding
  completeDoctorOnboarding: async (data: DoctorOnboardingRequest): Promise<OnboardingResponse> => {
    const response = await api.post('/onboarding/doctor', data);
    return response.data;
  },

  // Hospital onboarding
  completeHospitalOnboarding: async (data: HospitalOnboardingRequest): Promise<OnboardingResponse> => {
    const response = await api.post('/onboarding/hospital', data);
    return response.data;
  },

  // Update onboarding step
  updateOnboardingStep: async (step: number): Promise<OnboardingResponse> => {
    const response = await api.put('/onboarding/step', { step });
    return response.data;
  },

  // Get onboarding status
  getOnboardingStatus: async (): Promise<OnboardingStatus> => {
    const response = await api.get('/onboarding/status');
    return response.data;
  },
};

export default onboardingApi;

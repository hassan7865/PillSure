import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../_components/_api';
import { PatientOnboardingRequest, DoctorOnboardingRequest, HospitalOnboardingRequest } from '../_components/_types';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';

// Patient onboarding hook - handles both save and final submission
export const usePatientOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatientOnboardingRequest) => onboardingApi.savePatientOnboarding(data),
    onSuccess: (response: any) => {
      if (response?.isOnboardingComplete) {
        showSuccess('Patient profile created successfully!', 'Welcome to PillSure!');
        router.push('/');
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['patient-onboarding'] });
    },
    onError: (error: any) => {
      showError('Failed to save patient data', getErrorMessage(error));
    },
  });
};

// Doctor onboarding hook - handles both save and final submission
export const useDoctorOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DoctorOnboardingRequest) => onboardingApi.saveDoctorOnboarding(data),
    onSuccess: (response: any) => {
      if (response?.isOnboardingComplete) {
        showSuccess('Doctor profile created successfully!', 'Welcome to PillSure!');
        router.push('/dashboard');
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-onboarding'] });
    },
    onError: (error: any) => {
      showError('Failed to save doctor data', getErrorMessage(error));
    },
  });
};

// Hospital onboarding hook - handles both save and final submission
export const useHospitalOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HospitalOnboardingRequest) => onboardingApi.saveHospitalOnboarding(data),
    onSuccess: (response: any) => {
      if (response?.isOnboardingComplete) {
        showSuccess('Hospital profile created successfully!', 'Welcome to PillSure!');
        router.push('/dashboard');
      }
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['hospital-onboarding'] });
    },
    onError: (error: any) => {
      showError('Failed to save hospital data', getErrorMessage(error));
    },
  });
};

// Update onboarding step hook
export const useUpdateOnboardingStep = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (step: number) => onboardingApi.updateOnboardingStep(step),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
    },
  });
};

// Get onboarding status hook
export const useOnboardingStatus = () => {
  return useQuery({
    queryKey: ['onboarding-status'],
    queryFn: onboardingApi.getOnboardingStatus,
    retry: 1,
  });
};

// Get saved onboarding data hooks
export const useGetPatientOnboarding = () => {
  return useQuery({
    queryKey: ['patient-onboarding'],
    queryFn: onboardingApi.getPatientOnboarding,
    retry: 1,
  });
};

export const useGetDoctorOnboarding = () => {
  return useQuery({
    queryKey: ['doctor-onboarding'],
    queryFn: onboardingApi.getDoctorOnboarding,
    retry: 1,
  });
};

export const useGetHospitalOnboarding = () => {
  return useQuery({
    queryKey: ['hospital-onboarding'],
    queryFn: onboardingApi.getHospitalOnboarding,
    retry: 1,
  });
};

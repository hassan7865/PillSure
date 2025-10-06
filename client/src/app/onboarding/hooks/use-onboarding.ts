import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { onboardingApi } from '../_components/_api';
import { PatientOnboardingRequest, DoctorOnboardingRequest, HospitalOnboardingRequest } from '../_components/_types';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';

// Patient onboarding hook
export const usePatientOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatientOnboardingRequest) => onboardingApi.completePatientOnboarding(data),
    onSuccess: (data) => {
      showSuccess('Patient profile created successfully!', 'Welcome to PillSure!');
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      // Patients redirect to home page after onboarding
      router.push('/');
    },
    onError: (error: any) => {
      showError('Failed to create patient profile', getErrorMessage(error));
    },
  });
};

// Doctor onboarding hook
export const useDoctorOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: DoctorOnboardingRequest) => onboardingApi.completeDoctorOnboarding(data),
    onSuccess: (data) => {
      showSuccess('Doctor profile created successfully!', 'Welcome to PillSure!');
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      // Doctors redirect to dashboard after onboarding
      router.push('/dashboard');
    },
    onError: (error: any) => {
      showError('Failed to create doctor profile', getErrorMessage(error));
    },
  });
};

// Hospital onboarding hook
export const useHospitalOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: HospitalOnboardingRequest) => onboardingApi.completeHospitalOnboarding(data),
    onSuccess: (data) => {
      showSuccess('Hospital profile created successfully!', 'Welcome to PillSure!');
      queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      // Hospitals redirect to dashboard after onboarding
      router.push('/dashboard');
    },
    onError: (error: any) => {
      showError('Failed to create hospital profile', getErrorMessage(error));
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

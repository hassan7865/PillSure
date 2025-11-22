import { useState, useEffect, useCallback } from 'react';
import { onboardingApi } from '../_components/_api';
import { PatientOnboardingRequest, DoctorOnboardingRequest, HospitalOnboardingRequest } from '../_components/_types';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { useRouter } from 'next/navigation';
import { getErrorMessage } from '@/lib/error-utils';

// Patient onboarding hook - handles both save and final submission
export const usePatientOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: PatientOnboardingRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingApi.savePatientOnboarding(data);
      if (response?.isOnboardingComplete) {
        showSuccess('Patient profile created successfully!', 'Welcome to PillSure!');
        router.push('/');
      }
      return response;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to save patient data', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, router]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

// Doctor onboarding hook - handles both save and final submission
export const useDoctorOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: DoctorOnboardingRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingApi.saveDoctorOnboarding(data);
      if (response?.isOnboardingComplete) {
        showSuccess('Doctor profile created successfully!', 'Welcome to PillSure!');
        router.push('/dashboard');
      }
      return response;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to save doctor data', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, router]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

// Hospital onboarding hook - handles both save and final submission
export const useHospitalOnboarding = () => {
  const { showSuccess, showError } = useCustomToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: HospitalOnboardingRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingApi.saveHospitalOnboarding(data);
      if (response?.isOnboardingComplete) {
        showSuccess('Hospital profile created successfully!', 'Welcome to PillSure!');
        router.push('/dashboard');
      }
      return response;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to save hospital data', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError, router]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

// Update onboarding step hook
export const useUpdateOnboardingStep = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (step: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await onboardingApi.updateOnboardingStep(step);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update onboarding step'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

// Get onboarding status hook
export const useOnboardingStatus = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await onboardingApi.getOnboardingStatus();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch onboarding status'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.getOnboardingStatus();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch onboarding status'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, refetch };
};

// Get saved onboarding data hooks
export const useGetPatientOnboarding = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchOnboarding = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await onboardingApi.getPatientOnboarding();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch patient onboarding'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.getPatientOnboarding();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch patient onboarding'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, refetch };
};

export const useGetDoctorOnboarding = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchOnboarding = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await onboardingApi.getDoctorOnboarding();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch doctor onboarding'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.getDoctorOnboarding();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch doctor onboarding'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, refetch };
};

export const useGetHospitalOnboarding = () => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchOnboarding = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await onboardingApi.getHospitalOnboarding();
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch hospital onboarding'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchOnboarding();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await onboardingApi.getHospitalOnboarding();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch hospital onboarding'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, refetch };
};

import { useState, useEffect, useCallback } from 'react';
import { appointmentApi } from './components/_api';
import { CreateAppointmentRequest, UpdateAppointmentStatusRequest, UpdateAppointmentNotesRequest } from './components/_types';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { getErrorMessage } from '@/lib/error-utils';

export const useCreateAppointment = () => {
  const { showSuccess, showError } = useCustomToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (data: CreateAppointmentRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      await appointmentApi.createAppointment(data);
      showSuccess('Appointment booked successfully!', 'Your appointment has been confirmed.');
      return true;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to book appointment', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const usePatientAppointments = (status?: string) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAppointments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getPatientAppointments(status);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAppointments();

    return () => {
      isMounted = false;
    };
  }, [status]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await appointmentApi.getPatientAppointments(status);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  return { data, isLoading, error, refetch };
};

export const useDoctorAppointments = (doctorId: string, status?: string) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!doctorId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchAppointments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getDoctorAppointments(doctorId, status);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAppointments();

    return () => {
      isMounted = false;
    };
  }, [doctorId, status]);

  const refetch = useCallback(async () => {
    if (!doctorId) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await appointmentApi.getDoctorAppointments(doctorId, status);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch appointments'));
    } finally {
      setIsLoading(false);
    }
  }, [doctorId, status]);

  return { data, isLoading, error, refetch };
};

export const useAppointmentById = (id: string) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchAppointment = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getAppointmentById(id);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch appointment'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAppointment();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const refetch = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await appointmentApi.getAppointmentById(id);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch appointment'));
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  return { data, isLoading, error, refetch };
};

export const useUpdateAppointmentStatus = () => {
  const { showSuccess, showError } = useCustomToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: string; data: UpdateAppointmentStatusRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      await appointmentApi.updateAppointmentStatus(id, data);
      showSuccess('Appointment status updated', 'Status has been updated successfully.');
      return true;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to update status', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useUpdateAppointmentNotes = () => {
  const { showSuccess, showError } = useCustomToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async ({ id, data }: { id: string; data: UpdateAppointmentNotesRequest }) => {
    setIsLoading(true);
    setError(null);
    try {
      await appointmentApi.updateAppointmentNotes(id, data);
      showSuccess('Notes updated', 'Appointment notes have been updated successfully.');
      return true;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to update notes', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useDeleteAppointment = () => {
  const { showSuccess, showError } = useCustomToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await appointmentApi.deleteAppointment(id);
      showSuccess('Appointment deleted', 'The appointment has been deleted successfully.');
      return true;
    } catch (err: any) {
      const errorMsg = getErrorMessage(err);
      setError(err instanceof Error ? err : new Error(errorMsg));
      showError('Failed to delete appointment', errorMsg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [showSuccess, showError]);

  return { mutate, mutateAsync: mutate, isLoading, error };
};

export const useBookedSlots = (doctorId: string, date: string | undefined) => {
  const [data, setData] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!doctorId || !date) {
      setIsLoading(false);
      setData([]);
      return;
    }

    let isMounted = true;
    
    const fetchBookedSlots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getBookedSlots(doctorId, date);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch booked slots'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchBookedSlots();

    return () => {
      isMounted = false;
    };
  }, [doctorId, date]);

  return { data, isLoading, error };
};

export const useDoctorAppointmentStats = (doctorId: string) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!doctorId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getDoctorAppointmentStats(doctorId);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [doctorId]);

  return { data, isLoading, error };
};

export const useDoctorYearlyStats = (doctorId: string, year?: number) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!doctorId) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await appointmentApi.getDoctorYearlyStats(doctorId, year);
        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch yearly stats'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [doctorId, year]);

  return { data, isLoading, error };
};


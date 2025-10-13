import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { appointmentApi } from './components/_api';
import { CreateAppointmentRequest, UpdateAppointmentStatusRequest, UpdateAppointmentNotesRequest } from './components/_types';
import { useCustomToast } from '@/hooks/use-custom-toast';
import { getErrorMessage } from '@/lib/error-utils';

export const useCreateAppointment = () => {
  const { showSuccess, showError } = useCustomToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAppointmentRequest) => appointmentApi.createAppointment(data),
    onSuccess: () => {
      showSuccess('Appointment booked successfully!', 'Your appointment has been confirmed.');
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
    },
    onError: (error: any) => {
      showError('Failed to book appointment', getErrorMessage(error));
    },
  });
};

export const usePatientAppointments = (status?: string) => {
  return useQuery({
    queryKey: ['patient-appointments', status],
    queryFn: () => appointmentApi.getPatientAppointments(status),
    retry: 1,
  });
};

export const useDoctorAppointments = (doctorId: string, status?: string) => {
  return useQuery({
    queryKey: ['doctor-appointments', doctorId, status],
    queryFn: () => appointmentApi.getDoctorAppointments(doctorId, status),
    retry: 1,
    enabled: !!doctorId,
  });
};

export const useAppointmentById = (id: string) => {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentApi.getAppointmentById(id),
    retry: 1,
    enabled: !!id,
  });
};

export const useUpdateAppointmentStatus = () => {
  const { showSuccess, showError } = useCustomToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentStatusRequest }) => 
      appointmentApi.updateAppointmentStatus(id, data),
    onSuccess: () => {
      showSuccess('Appointment status updated', 'Status has been updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error: any) => {
      showError('Failed to update status', getErrorMessage(error));
    },
  });
};

export const useUpdateAppointmentNotes = () => {
  const { showSuccess, showError } = useCustomToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAppointmentNotesRequest }) => 
      appointmentApi.updateAppointmentNotes(id, data),
    onSuccess: () => {
      showSuccess('Notes updated', 'Appointment notes have been updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['appointment'] });
    },
    onError: (error: any) => {
      showError('Failed to update notes', getErrorMessage(error));
    },
  });
};

export const useDeleteAppointment = () => {
  const { showSuccess, showError } = useCustomToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => appointmentApi.deleteAppointment(id),
    onSuccess: () => {
      showSuccess('Appointment deleted', 'The appointment has been deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['patient-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-appointments'] });
    },
    onError: (error: any) => {
      showError('Failed to delete appointment', getErrorMessage(error));
    },
  });
};

export const useBookedSlots = (doctorId: string, date: string | undefined) => {
  return useQuery({
    queryKey: ['booked-slots', doctorId, date],
    queryFn: () => appointmentApi.getBookedSlots(doctorId, date!),
    enabled: !!doctorId && !!date,
    retry: 1,
  });
};


export interface ApiResponse<T = any> {
    data?: T;
    status: 'success' | 'error';
    error?: string;
    message?: string;
  }
  
  export interface CreateAppointmentRequest {
    doctorId: string;
    appointmentDate: string;
    appointmentTime: string;
    consultationMode: 'inperson' | 'online';
    patientNotes?: string;
  }
  
  export interface UpdateAppointmentStatusRequest {
    status: string;
    reason?: string;
  }
  
  export interface UpdateAppointmentNotesRequest {
  doctorNotes?: string;
  prescription?: {
    medicineId?: number;
    medicineName: string;
    quantity: number;
    dose: string;
  }[];
  diagnosis?: string[];
}
  
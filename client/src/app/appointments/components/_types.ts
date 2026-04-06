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

export interface CheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface DoctorDashboardStats {
  totalAppointments: number;
  byStatus: Record<string, number>;
  totalEarned: number;
  currency: string;
  isHospitalAffiliated: boolean;
  doctorId: string;
  hospitalId: string | null;
}

export interface HospitalDashboardStats {
  hospitalId: string;
  hospitalName: string;
  totalAppointments: number;
  byStatus: Record<string, number>;
  totalEarned: number;
  currency: string;
}

export interface HospitalDoctorRow {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  gender: string;
  specializationIds: number[];
  specializationNames: string[];
  experienceYears: number;
  feePkr: string | null;
  consultationModes: string[] | null;
  openingTime: string | null;
  closingTime: string | null;
  availableDays: string[] | null;
  isActive: boolean;
  byStatus: Record<string, number>;
  totalAppointments: number;
  totalEarned: number;
}

export interface HospitalDoctorsPayload {
  doctors: HospitalDoctorRow[];
  stats: {
    totalDoctors: number;
    activeDoctors: number;
    inactiveDoctors: number;
    totalAppointments: number;
  };
}

export interface HospitalDoctorSummary {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  feePkr: string | null;
}
export interface HospitalDoctorAppointmentRow {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  consultationMode: string;
  patientName: string;
  patientEmail: string;
  paymentStatus?: string;
}

export interface HospitalDoctorAppointmentsPayload {
  doctor: HospitalDoctorSummary;
  appointments: HospitalDoctorAppointmentRow[];
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
  
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
    practiceAffiliationId?: string | null;
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

export interface ClinicDashboardStats {
  clinicId: string;
  clinicName: string;
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
  hospitalAffiliationId?: string | null;
  hospitalAffiliationStatus?: string | null;
  byStatus: Record<string, number>;
  totalAppointments: number;
  totalEarned: number;
}

export type ClinicDoctorRow = Omit<HospitalDoctorRow, "hospitalAffiliationId" | "hospitalAffiliationStatus"> & {
  clinicAffiliationId?: string | null;
  clinicAffiliationStatus?: string | null;
};

export interface HospitalDoctorsPayload {
  doctors: HospitalDoctorRow[];
  stats: {
    totalDoctors: number;
    activeDoctors: number;
    inactiveDoctors: number;
    totalAppointments: number;
  };
}

export interface ClinicDoctorsPayload {
  doctors: ClinicDoctorRow[];
  stats: HospitalDoctorsPayload["stats"];
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

export type ClinicDoctorAppointmentRow = HospitalDoctorAppointmentRow;

export interface HospitalDoctorAppointmentsPayload {
  doctor: HospitalDoctorSummary;
  appointments: HospitalDoctorAppointmentRow[];
}

export interface OfferSlot {
  day: string;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
  catalogServiceIds: string[];
}

export interface HospitalOfferedCatalogService {
  catalogServiceId: string;
  serviceName: string;
  description?: string;
  durationMinutes: number;
}

export interface HospitalDoctorOfferService {
  offeredServices: HospitalOfferedCatalogService[];
  offeredSlots: OfferSlot[];
}

export interface HospitalDoctorOfferConflict {
  code: "outside_doctor_base" | "overlap_other_affiliation";
  message: string;
  day: string;
  startTime: string;
  endTime: string;
  otherAffiliationId?: string;
}

export interface HospitalDoctorOfferRow {
  id: string;
  hospitalId: string;
  doctorId: string;
  practiceAffiliationId: string;
  createdByUserId: string;
  services: HospitalDoctorOfferService;
  conflicts: HospitalDoctorOfferConflict[];
  status: string;
  isActive: boolean;
  doctorReviewedAt: string | null;
  doctorDecision: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HospitalOfferHistoryRow extends HospitalDoctorOfferRow {
  doctorFirstName?: string | null;
  doctorLastName?: string | null;
  doctorEmail?: string | null;
  doctorName?: string;
}

export interface HospitalCatalogService {
  id: string;
  hospitalId: string;
  serviceName: string;
  description: string | null;
  durationMinutes: number;
  rate: string;
  currency: "PKR";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  
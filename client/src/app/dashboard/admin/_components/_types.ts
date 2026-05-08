export interface AdminStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  medicines: {
    total: number;
  };
  doctors: {
    total: number;
    active: number;
  };
  hospitals: {
    total: number;
    active: number;
  };
  clinics?: {
    total: number;
    active: number;
  };
  appointments: {
    total: number;
    byStatus: Record<string, number>;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    paidRevenue: string;
  };
}

export interface AdminMonthlyRevenue {
  year: number;
  currency: string;
  totalRevenue: number;
  revenueByMonth: Array<{
    month: number;
    label: string;
    revenue: number;
  }>;
}

export interface Doctor {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  mobile: string;
  specializationIds: number[];
  qualifications: string[];
  experienceYears: number;
  patientSatisfactionRate: string;
  hospitalId: string | null;
  address: string;
  image: string | null;
  feePkr: string | null;
  consultationModes: string[] | null;
  openingTime: string | null;
  closingTime: string | null;
  availableDays: string[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  hospitalName: string | null;
  hospitalAddress: string | null;
  hospitalContactNo: string | null;
}

export interface Hospital {
  id: string;
  userId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalContactNo: string;
  hospitalEmail: string;
  websiteHospital: string | null;
  licenseNo: string;
  adminName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedDoctors {
  doctors: Doctor[];
  pagination: PaginationInfo;
}

export interface PaginatedHospitals {
  hospitals: Hospital[];
  pagination: PaginationInfo;
}

export interface Clinic {
  id: string;
  userId: string;
  clinicName: string;
  clinicAddress: string;
  clinicContactNo: string;
  clinicEmail: string;
  websiteClinic: string | null;
  licenseNo: string;
  adminName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
}

export interface PaginatedClinics {
  clinics: Clinic[];
  pagination: PaginationInfo;
}

export interface AdminSpecialization {
  id: number;
  name: string;
}


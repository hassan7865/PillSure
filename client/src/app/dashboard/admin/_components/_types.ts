export interface AdminStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  medicines: {
    total: number;
    inStock: number;
  };
  doctors: {
    total: number;
    active: number;
  };
  hospitals: {
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

export type OrderStatus = "pending" | "shipped" | "delivered" | "returned";

export interface AdminOrder {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: string;
  total: string;
  currency: string;
  shippingAddress: string | null;
  contactNo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrders {
  orders: AdminOrder[];
  pagination: PaginationInfo;
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

export interface Medicine {
  id: number;
  medicineName: string;
  medicineUrl: string | null;
  price: string | null;
  discount: string | null;
  stock: number | null;
  images: any | null;
  prescriptionRequired: boolean;
  createdAt: string | null;
  description: any | null;
  drugCategory: string | null;
  drugVarient: string | null;
}

export interface PaginatedMedicines {
  medicines: Medicine[];
  pagination: PaginationInfo;
}

export interface UpdateMedicineRequest {
  medicineName?: string;
  medicineUrl?: string | null;
  price?: string | null;
  discount?: string | null;
  stock?: number | null;
  images?: any | null;
  prescriptionRequired?: boolean;
  description?: any | null;
  drugCategory?: string | null;
  drugVarient?: string | null;
}


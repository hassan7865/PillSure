import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { Doctor, Specialization } from '@/lib/types';

// Helper function to transform doctor data
const transformDoctor = (doctor: any): Doctor => {
  const primarySpecializationName = doctor.primarySpecialization?.name || 
    doctor.specializations?.[0]?.name || 
    `Specialization ${doctor.specializationIds?.[0] || 'N/A'}`;

  return {
    ...doctor,
    name: `${doctor.firstName} ${doctor.lastName}`,
    specialization: primarySpecializationName,
    experience: doctor.experienceYears,
    fee: parseFloat(doctor.feePkr || '0'),
    rating: parseFloat(doctor.patientSatisfactionRate || '0'),
    availableDays: doctor.availableDays || null,
    openingTime: doctor.openingTime || null,
    closingTime: doctor.closingTime || null,
    hospital: doctor.hospitalId ? {
      id: doctor.hospitalId,
      name: doctor.hospitalName,
      address: doctor.hospitalAddress,
      contactNo: '',
      email: '',
      licenseNo: '',
      adminName: '',
    } : null,
  };
};

export const doctorApi = {
  getSpecializations: async (): Promise<Specialization[]> => {
    const response = await api.get<ApiResponse<Specialization[]>>('/doctor/specializations');
    return response.data.data || [];
  },

  getDoctors: async (
    page: number = 1,
    limit: number = 10,
    specializationIds: string[] = [],
    search: string = ''
  ): Promise<{ doctors: Doctor[]; pagination: any }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(specializationIds.length > 0 && { specializationIds: specializationIds.join(',') })
    });
    
    const response = await api.get<ApiResponse<{ doctors: any[]; pagination: any }>>(
      `/doctor/search-doctors?${params}`
    );
    
    const rawData = response.data.data || { doctors: [], pagination: {} };
    
    // Transform the raw doctor data to match our UI expectations
    const transformedDoctors: Doctor[] = rawData.doctors.map((doctor: any) => transformDoctor(doctor));
    
    return {
      doctors: transformedDoctors,
      pagination: rawData.pagination
    };
  },

  getDoctorById: async (doctorId: string): Promise<Doctor> => {
    const response = await api.get<ApiResponse<any>>(`/doctor/${doctorId}`);
    const doctor = response.data.data;
    
    if (!doctor) {
      throw new Error("Doctor not found");
    }

    return transformDoctor(doctor);
  },
};

export interface Review {
  id: string;
  userId: string;
  doctorId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateReviewRequest {
  rating: number;
  comment?: string;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  averageRating: number;
  totalReviews: number;
}

export const reviewApi = {
  createReview: async (doctorId: string, data: CreateReviewRequest): Promise<Review> => {
    const response = await api.post<ApiResponse<Review>>(`/doctor/${doctorId}/reviews`, data);
    return response.data.data!;
  },

  getReviews: async (doctorId: string, page: number = 1, limit: number = 10): Promise<ReviewsResponse> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await api.get<ApiResponse<ReviewsResponse>>(
      `/doctor/${doctorId}/reviews?${params.toString()}`
    );
    return response.data.data!;
  },
};

export default doctorApi;


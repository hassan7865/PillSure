import api from './interceptor';
import { Doctor, Specialization } from './types';


export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
}

// Doctor API functions
export const doctorApi = {
  // Get all specializations
  getSpecializations: async (): Promise<Specialization[]> => {
    const response = await api.get<ApiResponse<Specialization[]>>('/doctor/specializations');
    return response.data.data || [];
  },

  // Get doctors with search and filters
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
    const transformedDoctors: Doctor[] = rawData.doctors.map((doctor: any) => {
      // Get primary specialization name from the backend data
      const primarySpecializationName = doctor.primarySpecialization?.name || 
        doctor.specializations?.[0]?.name || 
        `Specialization ${doctor.specializationIds[0] || 'N/A'}`;
      
      return {
        ...doctor,
        // Add computed fields for UI compatibility
        name: `${doctor.firstName} ${doctor.lastName}`,
        specialization: primarySpecializationName,
        experience: doctor.experienceYears,
        fee: parseFloat(doctor.feePkr),
        rating: parseFloat(doctor.patientSatisfactionRate),
      };
    });
    
    return {
      doctors: transformedDoctors,
      pagination: rawData.pagination
    };
  },

  // Get current doctor profile
  getCurrentDoctor: async (): Promise<Doctor> => {
    const response = await api.get<ApiResponse<Doctor>>('/doctor/me');
    if (!response.data.data) {
      throw new Error('Doctor profile not found');
    }
    return response.data.data;
  },
};

export default doctorApi;

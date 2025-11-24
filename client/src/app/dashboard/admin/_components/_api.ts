import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { AdminStats, PaginatedDoctors, PaginatedHospitals, PaginatedMedicines, Medicine, UpdateMedicineRequest } from './_types';

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return response.data.data!;
  },

  getDoctors: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedDoctors> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await api.get<ApiResponse<PaginatedDoctors>>(`/admin/doctors?${params}`);
    return response.data.data!;
  },

  getHospitals: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedHospitals> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await api.get<ApiResponse<PaginatedHospitals>>(`/admin/hospitals?${params}`);
    return response.data.data!;
  },

  getMedicines: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedMedicines> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    const response = await api.get<ApiResponse<PaginatedMedicines>>(`/admin/medicines?${params}`);
    return response.data.data!;
  },

  updateMedicine: async (medicineId: number, data: UpdateMedicineRequest): Promise<Medicine> => {
    const response = await api.put<ApiResponse<Medicine>>(`/admin/medicines/${medicineId}`, data);
    return response.data.data!;
  },

  updateMedicineImages: async (
    medicineId: number,
    newImages: File[],
    existingImages: string[]
  ): Promise<Medicine> => {
    const formData = new FormData();

    // Append new image files
    newImages.forEach((file) => {
      formData.append('images', file);
    });

    // Append existing image URLs as JSON string
    formData.append('existingImages', JSON.stringify(existingImages));

    const response = await api.patch<ApiResponse<Medicine>>(
      `/medicine/${medicineId}/images`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.data!;
  },
};

export default adminApi;


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

  updateMedicine: async (
    medicineId: number,
    data: UpdateMedicineRequest,
    newImages?: File[],
    existingImages?: string[]
  ): Promise<Medicine> => {
    // If images are provided, use FormData for multipart upload
    if (newImages || existingImages) {
      const formData = new FormData();

      // Append all medicine data fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, typeof value === 'boolean' ? String(value) : value);
        }
      });

      // Append new image files
      if (newImages) {
        newImages.forEach((file) => {
          formData.append('images', file);
        });
      }

      // Append existing image URLs
      if (existingImages) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      const response = await api.put<ApiResponse<Medicine>>(
        `/admin/medicines/${medicineId}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.data!;
    }

    // Otherwise, send JSON data
    const response = await api.put<ApiResponse<Medicine>>(`/admin/medicines/${medicineId}`, data);
    return response.data.data!;
  },
};

export default adminApi;


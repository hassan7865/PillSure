import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import {
  AdminStats,
  PaginatedDoctors,
  PaginatedHospitals,
  PaginatedMedicines,
  Medicine,
  UpdateMedicineRequest,
  PaginatedOrders,
  OrderStatus,
  AdminMonthlyRevenue,
  PaginatedDrugCategories,
  DrugCategory,
  AdminSpecialization,
  DrugCategoryMappingsResponse,
} from './_types';

import { extractApiData, buildQueryParams } from '@/lib/api-utils';

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const response = await api.get<ApiResponse<AdminStats>>('/admin/stats');
    return extractApiData(response);
  },
  getMonthlyRevenue: async (year?: number): Promise<AdminMonthlyRevenue> => {
    const query = buildQueryParams({ year: year || undefined });
    const response = await api.get<ApiResponse<AdminMonthlyRevenue>>(`/admin/revenue/monthly?${query}`);
    return extractApiData(response);
  },

  getDoctors: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedDoctors> => {
    const params = buildQueryParams({ page, limit, search: search || undefined });
    const response = await api.get<ApiResponse<PaginatedDoctors>>(`/admin/doctors?${params}`);
    return extractApiData(response);
  },

  getHospitals: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedHospitals> => {
    const params = buildQueryParams({ page, limit, search: search || undefined });
    const response = await api.get<ApiResponse<PaginatedHospitals>>(`/admin/hospitals?${params}`);
    return extractApiData(response);
  },

  getMedicines: async (page: number = 1, limit: number = 10, search: string = ''): Promise<PaginatedMedicines> => {
    const params = buildQueryParams({ page, limit, search: search || undefined });
    const response = await api.get<ApiResponse<PaginatedMedicines>>(`/admin/medicines?${params}`);
    return extractApiData(response);
  },

  getDrugCategories: async (
    page: number = 1,
    limit: number = 10,
    search: string = ''
  ): Promise<PaginatedDrugCategories> => {
    const params = buildQueryParams({ page, limit, search: search || undefined });
    const response = await api.get<ApiResponse<PaginatedDrugCategories>>(`/admin/drug-categories?${params}`);
    return extractApiData(response);
  },

  createDrugCategory: async (name: string): Promise<DrugCategory> => {
    const response = await api.post<ApiResponse<DrugCategory>>('/admin/drug-categories', { name });
    return extractApiData(response);
  },

  updateDrugCategory: async (id: number, name: string): Promise<DrugCategory> => {
    const response = await api.put<ApiResponse<DrugCategory>>(`/admin/drug-categories/${id}`, { name });
    return extractApiData(response);
  },

  deleteDrugCategory: async (id: number): Promise<{ id: number }> => {
    const response = await api.delete<ApiResponse<{ id: number }>>(`/admin/drug-categories/${id}`);
    return extractApiData(response);
  },

  getAdminSpecializations: async (): Promise<AdminSpecialization[]> => {
    const response = await api.get<ApiResponse<AdminSpecialization[]>>('/admin/specializations');
    return extractApiData(response);
  },

  getDrugCategoryMappings: async (categoryId: number): Promise<DrugCategoryMappingsResponse> => {
    const response = await api.get<ApiResponse<DrugCategoryMappingsResponse>>(
      `/admin/drug-categories/${categoryId}/mappings`
    );
    return extractApiData(response);
  },

  setDrugCategoryMappings: async (
    categoryId: number,
    specializationIds: number[]
  ): Promise<{ drugCategoryId: number; specializationIds: number[] }> => {
    const response = await api.put<ApiResponse<{ drugCategoryId: number; specializationIds: number[] }>>(
      `/admin/drug-categories/${categoryId}/mappings`,
      { specializationIds }
    );
    return extractApiData(response);
  },

  getOrders: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatus | '';
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<PaginatedOrders> => {
    const query = buildQueryParams({
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      search: params.search || undefined,
      status: params.status || undefined,
      dateFrom: params.dateFrom || undefined,
      dateTo: params.dateTo || undefined,
    });
    const response = await api.get<ApiResponse<PaginatedOrders>>(`/admin/orders?${query}`);
    return extractApiData(response);
  },

  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    const response = await api.patch<ApiResponse<any>>(`/admin/orders/${orderId}/status`, { status });
    return extractApiData(response);
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
        if (value === undefined) return;
        if (value === null) {
          formData.append(key, "");
          return;
        }
        formData.append(
          key,
          typeof value === "boolean" ? String(value) : String(value as string | number)
        );
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

      return extractApiData(response);
    }

    // Otherwise, send JSON data
    const response = await api.put<ApiResponse<Medicine>>(`/admin/medicines/${medicineId}`, data);
    return extractApiData(response);
  },
};

export default adminApi;


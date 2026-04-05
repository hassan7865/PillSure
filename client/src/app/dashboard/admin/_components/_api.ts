import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import {
  AdminStats,
  PaginatedDoctors,
  PaginatedHospitals,
  AdminMonthlyRevenue,
  AdminSpecialization,
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

  getAdminSpecializations: async (): Promise<AdminSpecialization[]> => {
    const response = await api.get<ApiResponse<AdminSpecialization[]>>('/admin/specializations');
    return extractApiData(response);
  },
};

export default adminApi;

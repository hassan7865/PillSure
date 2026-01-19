import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { extractApiData, extractApiDataWithFallback, buildQueryString } from '@/lib/api-utils';

export interface Medicine {
  id: number;
  medicineName: string;
  medicineUrl?: string | null;
  price?: string | null;
  discount?: string | null;
  stock?: number | null;
  images?: string[] | null;
  prescriptionRequired?: boolean;
  createdAt?: string | null;
  drugDescription?: string | null; // Plain text description
  drugCategory?: string | null;
  drugVarient?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null; // FAQs array
}

export const medicineApi = {
  getMedicineById: async (medicineId: number): Promise<Medicine> => {
    const response = await api.get<ApiResponse<Medicine>>(`/medicine/${medicineId}`);
    return extractApiData(response);
  },

  getFeaturedMedicines: async (params?: {
    limit?: number;
    category?: string;
    uniqueCategories?: boolean;
  }): Promise<Medicine[]> => {
    const queryString = buildQueryString({
      limit: params?.limit,
      category: params?.category,
      uniqueCategories: params?.uniqueCategories,
    });

    const response = await api.get<ApiResponse<Medicine[]>>(`/medicine/featured${queryString}`);
    return extractApiDataWithFallback(response, []);
  },

  searchMedicines: async (query: string, limit: number = 20): Promise<Medicine[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const queryString = buildQueryString({
      q: query.trim(),
      limit: limit || undefined,
    });

    const response = await api.get<ApiResponse<Medicine[]>>(`/medicine/search${queryString}`);
    return extractApiDataWithFallback(response, []);
  },
};

export default medicineApi;


import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';

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
    const medicine = response.data.data;
    
    if (!medicine) {
      throw new Error("Medicine not found");
    }

    return medicine;
  },

  getFeaturedMedicines: async (params?: {
    limit?: number;
    category?: string;
    uniqueCategories?: boolean;
  }): Promise<Medicine[]> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.category) searchParams.set('category', params.category);
    if (params?.uniqueCategories !== undefined) {
      searchParams.set('uniqueCategories', params.uniqueCategories.toString());
    }

    const url = `/medicine/featured${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await api.get<ApiResponse<Medicine[]>>(url);
    return response.data.data || [];
  },

  searchMedicines: async (query: string, limit: number = 20): Promise<Medicine[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }
    const searchParams = new URLSearchParams();
    searchParams.set('q', query.trim());
    if (limit) searchParams.set('limit', limit.toString());

    const url = `/medicine/search?${searchParams.toString()}`;
    const response = await api.get<ApiResponse<Medicine[]>>(url);
    const apiResponse = response.data;
    const medicines = apiResponse?.data;
    
    if (Array.isArray(medicines)) {
      return medicines;
    }
    return [];
  },
};

export default medicineApi;


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

export interface CatalogCategory {
  category: string;
  items: Medicine[];
}

export interface CatalogResponse {
  categories: CatalogCategory[];
  pagination: {
    categoryPage: number;
    categoriesPerPage: number;
    hasMoreCategories: boolean;
  };
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

  getCatalogMedicines: async (params?: {
    category?: string;
    search?: string;
    perCategoryLimit?: number;
    categoryPage?: number;
    categoriesPerPage?: number;
  }): Promise<CatalogResponse> => {
    const queryString = buildQueryString({
      category: params?.category,
      search: params?.search,
      perCategoryLimit: params?.perCategoryLimit,
      categoryPage: params?.categoryPage,
      categoriesPerPage: params?.categoriesPerPage,
    });

    const response = await api.get<ApiResponse<CatalogResponse>>(`/medicine/catalog${queryString}`);
    return extractApiDataWithFallback(response, {
      categories: [],
      pagination: {
        categoryPage: params?.categoryPage || 1,
        categoriesPerPage: params?.categoriesPerPage || 6,
        hasMoreCategories: false,
      },
    });
  },
};

export default medicineApi;


import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { extractApiData, extractApiDataWithFallback, buildQueryString } from '@/lib/api-utils';

export interface Medicine {
  id: number;
  medicineName: string;
  prescriptionRequired?: boolean;
  createdAt?: string | null;
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

export interface ManufacturerOption {
  id: string;
  legalName: string;
  shortName: string | null;
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

  searchMedicines: async (
    query: string,
    limit: number = 20,
    manufacturerId?: string,
  ): Promise<Medicine[]> => {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const queryString = buildQueryString({
      q: query.trim(),
      limit: limit || undefined,
      manufacturerId: manufacturerId?.trim() || undefined,
    });

    const response = await api.get<ApiResponse<Medicine[]>>(`/medicine/search${queryString}`);
    return extractApiDataWithFallback(response, []);
  },

  listManufacturers: async (): Promise<ManufacturerOption[]> => {
    const response = await api.get<ApiResponse<ManufacturerOption[]>>(`/medicine/manufacturers`);
    return extractApiDataWithFallback(response, []);
  },
resolveManufacturerBatch: async (
    medicineId: number,
    manufacturerId: string,
  ): Promise<string | null> => {
    const queryString = buildQueryString({
      medicineId,
      manufacturerId: manufacturerId.trim(),
    });
    const response = await api.get<ApiResponse<{ manufacturerMedicineId: string | null }>>(
      `/medicine/manufacturer-batch${queryString}`,
    );
    const data = extractApiData(response);
    return data.manufacturerMedicineId ?? null;
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


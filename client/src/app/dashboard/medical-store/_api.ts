import api from "@/lib/interceptor";
import { ApiResponse } from "@/lib/types";
import { extractApiData } from "@/lib/api-utils";

export interface MedicalStoreCategoryRef {
  id: string;
  name: string;
}

export interface MedicalStoreCategory {
  id: string;
  medicalStoreId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalStoreCatalogRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
  categories: MedicalStoreCategoryRef[];
  retailPrice: string;
  listedQuantity: number;
  currency: string;
  isActive: boolean;
  prescriptionRequired: boolean;
  displayImageUrl: string | null;
  packImages: string[] | null;
  manufacturerMedicineId: string | null;
  manufacturerId: string | null;
  manufacturerName: string | null;
  drugDescription: string | null;
  faqs: Array<{ question: string; answer: string }> | null;
  sortOrder: number;
  updatedAt: string;
}

export interface MedicalStoreCatalogResponse {
  items: MedicalStoreCatalogRow[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalSkus: number;
    activeSkus: number;
    totalUnitsListed: number;
  };
}

export interface CreateMedicalStoreListingBody {
  medicineId: number;
  retailPrice: string | number;
  listedQuantity: number;
  currency?: string;
  packImages?: string[] | null;
  manufacturerMedicineId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  categoryIds?: string[];
  drugDescription?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

export interface UpdateMedicalStoreListingBody {
  retailPrice?: string | number;
  listedQuantity?: number;
  currency?: string;
  packImages?: string[] | null;
  manufacturerMedicineId?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  categoryIds?: string[];
  drugDescription?: string | null;
  faqs?: Array<{ question: string; answer: string }> | null;
}

function appendListingFields(
  formData: FormData,
  body: CreateMedicalStoreListingBody | UpdateMedicalStoreListingBody,
) {
  const entries = Object.entries(body) as [string, unknown][];
  for (const [key, value] of entries) {
    if (value === undefined || key === "packImages") continue;
    if (key === "faqs") {
      if (value === null) formData.append("faqs", "");
      else formData.append("faqs", typeof value === "string" ? value : JSON.stringify(value));
      continue;
    }
    if (key === "categoryIds" && Array.isArray(value)) {
      formData.append("categoryIds", JSON.stringify(value));
      continue;
    }
    if (value === null) {
      formData.append(key, "");
      continue;
    }
    if (typeof value === "boolean") {
      formData.append(key, value ? "true" : "false");
    } else {
      formData.append(key, String(value));
    }
  }
}

export const medicalStoreApi = {
  listCategories: async (): Promise<MedicalStoreCategory[]> => {
    const response = await api.get<ApiResponse<MedicalStoreCategory[]>>("/medical-store/categories");
    return extractApiData(response);
  },

  createCategory: async (body: { name: string; sortOrder?: number }): Promise<MedicalStoreCategory> => {
    const response = await api.post<ApiResponse<MedicalStoreCategory>>("/medical-store/categories", body);
    return extractApiData(response);
  },

  updateCategory: async (
    categoryId: string,
    body: { name?: string; sortOrder?: number },
  ): Promise<MedicalStoreCategory> => {
    const response = await api.patch<ApiResponse<MedicalStoreCategory>>(
      `/medical-store/categories/${categoryId}`,
      body,
    );
    return extractApiData(response);
  },

  deleteCategory: async (categoryId: string): Promise<void> => {
    await api.delete(`/medical-store/categories/${categoryId}`);
  },

  listCatalog: async (page = 1, limit = 12): Promise<MedicalStoreCatalogResponse> => {
    const response = await api.get<ApiResponse<MedicalStoreCatalogResponse>>(
      `/medical-store/catalog?page=${page}&limit=${limit}`,
    );
    return extractApiData(response);
  },

  createListing: async (
    body: CreateMedicalStoreListingBody,
    packImageFiles?: File[],
  ): Promise<MedicalStoreCatalogRow> => {
    if (packImageFiles?.length) {
      const formData = new FormData();
      appendListingFields(formData, body);
      packImageFiles.forEach((file) => formData.append("packImages", file));
      const response = await api.post<ApiResponse<MedicalStoreCatalogRow>>(`/medical-store/listings`, formData);
      return extractApiData(response);
    }
    const response = await api.post<ApiResponse<MedicalStoreCatalogRow>>(`/medical-store/listings`, body);
    return extractApiData(response);
  },

  updateListing: async (
    listingId: string,
    body: UpdateMedicalStoreListingBody,
    options?: {
      packImageFiles?: File[];
      existingPackImageUrls?: string[];
    },
  ): Promise<MedicalStoreCatalogRow> => {
    const useMultipart =
      (options?.packImageFiles?.length ?? 0) > 0 || options?.existingPackImageUrls !== undefined;

    if (useMultipart) {
      const formData = new FormData();
      appendListingFields(formData, body);
      if (options?.existingPackImageUrls !== undefined) {
        formData.append("existingPackImages", JSON.stringify(options.existingPackImageUrls));
      }
      options?.packImageFiles?.forEach((file) => formData.append("packImages", file));
      const response = await api.patch<ApiResponse<MedicalStoreCatalogRow>>(
        `/medical-store/listings/${listingId}`,
        formData,
      );
      return extractApiData(response);
    }

    const response = await api.patch<ApiResponse<MedicalStoreCatalogRow>>(
      `/medical-store/listings/${listingId}`,
      body,
    );
    return extractApiData(response);
  },

  deleteListing: async (listingId: string): Promise<void> => {
    await api.delete(`/medical-store/listings/${listingId}`);
  },

  getListing: async (listingId: string): Promise<MedicalStoreCatalogRow> => {
    const response = await api.get<ApiResponse<MedicalStoreCatalogRow>>(`/medical-store/listings/${listingId}`);
    return extractApiData(response);
  },

  listWholesaleManufacturers: async (): Promise<WholesaleManufacturerRow[]> => {
    const response = await api.get<ApiResponse<WholesaleManufacturerRow[]>>("/medical-store/wholesale/manufacturers");
    return extractApiData(response);
  },

  getWholesaleCatalog: async (
    manufacturerId: string,
    page = 1,
    limit = 20,
    search?: string,
  ): Promise<WholesaleCatalogResponse> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search?.trim()) q.set("search", search.trim());
    const response = await api.get<ApiResponse<WholesaleCatalogResponse>>(
      `/medical-store/wholesale/manufacturers/${manufacturerId}/catalog?${q.toString()}`,
    );
    return extractApiData(response);
  },

  listWholesaleOrders: async (page = 1, limit = 20): Promise<WholesaleOrdersListResponse> => {
    const response = await api.get<ApiResponse<WholesaleOrdersListResponse>>(
      `/medical-store/wholesale/orders?page=${page}&limit=${limit}`,
    );
    return extractApiData(response);
  },

  createWholesaleOrder: async (body: CreateWholesaleOrderBody): Promise<WholesaleOrderSummaryRow> => {
    const response = await api.post<ApiResponse<WholesaleOrderSummaryRow>>("/medical-store/wholesale/orders", body);
    return extractApiData(response);
  },

  listRetailOrders: async (page = 1, limit = 20): Promise<RetailOrdersListResponse> => {
    const response = await api.get<ApiResponse<RetailOrdersListResponse>>(
      `/medical-store/retail/orders?page=${page}&limit=${limit}`,
    );
    return extractApiData(response);
  },

  updateRetailOrderStatus: async (orderId: string, status: string): Promise<RetailOrderRow> => {
    const response = await api.patch<ApiResponse<RetailOrderRow>>(
      `/medical-store/retail/orders/${orderId}/status`,
      { status },
    );
    return extractApiData(response);
  },

  uploadStoreLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const formData = new FormData();
    formData.append("logo", file);
    const response = await api.post<ApiResponse<{ logoUrl: string }>>("/medical-store/profile/logo", formData);
    return extractApiData(response);
  },

  clearStoreLogo: async (): Promise<{ logoUrl: null }> => {
    const response = await api.delete<ApiResponse<{ logoUrl: null }>>("/medical-store/profile/logo");
    return extractApiData(response);
  },
};

export interface WholesaleManufacturerRow {
  id: string;
  legalName: string;
  shortName: string | null;
  displayName: string;
}

export interface WholesaleCatalogRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
  wholesalePrice: string;
  moq: number;
  listedQuantity: number;
  currency: string;
}

export interface WholesaleCatalogResponse {
  items: WholesaleCatalogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateWholesaleOrderBody {
  manufacturerId: string;
  items: { manufacturerMedicineId: string; quantity: number }[];
  notes?: string | null;
}

export interface WholesaleOrderSummaryRow {
  id: string;
  manufacturerId: string;
  medicalStoreId: string;
  status: string;
  currency: string;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  manufacturerDisplayName?: string;
}

export interface WholesaleOrdersListResponse {
  items: WholesaleOrderSummaryRow[];
  total: number;
  page: number;
  limit: number;
}

export interface RetailOrderLine {
  medicineId: number;
  medicineName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  images: unknown;
}

export interface RetailOrderRow {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: string;
  currency: string;
  shippingAddress: string | null;
  contactNo: string | null;
  createdAt: string;
  updatedAt: string;
lines: RetailOrderLine[];
}

export interface RetailOrdersListResponse {
  items: RetailOrderRow[];
  total: number;
  page: number;
  limit: number;
}

export default medicalStoreApi;

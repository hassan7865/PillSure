import api from "@/lib/interceptor";
import { ApiResponse } from "@/lib/types";
import { extractApiData } from "@/lib/api-utils";

export interface PublicStoreSummary {
  id: string;
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  country: string;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  activeListingCount: number;
}

export interface PublicStoresListResponse {
  items: PublicStoreSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PublicStoreDetail {
  id: string;
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  openingTime: string | null;
  closingTime: string | null;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
}

export interface MedicalStoreCategoryRef {
  id: string;
  name: string;
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

export interface PublicStoreCatalogResponse {
  items: MedicalStoreCatalogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface MarketplaceListingHit extends MedicalStoreCatalogRow {
  medicalStoreId: string;
  storeName: string;
}

export interface MarketplaceListingSearchResponse {
  items: MarketplaceListingHit[];
  total: number;
  page: number;
  limit: number;
}

export const marketplaceApi = {
  listStores: async (params: {
    page?: number;
    limit?: number;
    q?: string;
    lat?: number;
    lng?: number;
  }): Promise<PublicStoresListResponse> => {
    const sp = new URLSearchParams();
    if (params.page != null) sp.set("page", String(params.page));
    if (params.limit != null) sp.set("limit", String(params.limit));
    if (params.q) sp.set("q", params.q);
    if (params.lat != null) sp.set("lat", String(params.lat));
    if (params.lng != null) sp.set("lng", String(params.lng));
    const q = sp.toString();
    const response = await api.get<ApiResponse<PublicStoresListResponse>>(
      `/marketplace/stores${q ? `?${q}` : ""}`,
    );
    return extractApiData(response);
  },

  getStore: async (storeId: string): Promise<PublicStoreDetail> => {
    const response = await api.get<ApiResponse<PublicStoreDetail>>(`/marketplace/stores/${storeId}`);
    return extractApiData(response);
  },

  getStoreCatalog: async (
    storeId: string,
    page = 1,
    limit = 24,
    medicineId?: number,
  ): Promise<PublicStoreCatalogResponse> => {
    const sp = new URLSearchParams();
    sp.set("page", String(page));
    sp.set("limit", String(limit));
    if (medicineId != null && Number.isFinite(medicineId)) {
      sp.set("medicineId", String(Math.floor(medicineId)));
    }
    const response = await api.get<ApiResponse<PublicStoreCatalogResponse>>(
      `/marketplace/stores/${storeId}/catalog?${sp.toString()}`,
    );
    return extractApiData(response);
  },

  searchListings: async (params: {
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<MarketplaceListingSearchResponse> => {
    const sp = new URLSearchParams();
    if (params.page != null) sp.set("page", String(params.page));
    if (params.limit != null) sp.set("limit", String(params.limit));
    if (params.q) sp.set("q", params.q);
    const q = sp.toString();
    const response = await api.get<ApiResponse<MarketplaceListingSearchResponse>>(
      `/marketplace/listings/search${q ? `?${q}` : ""}`,
    );
    return extractApiData(response);
  },
};

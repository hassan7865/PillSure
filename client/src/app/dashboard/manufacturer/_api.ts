import api from '@/lib/interceptor';
import { ApiResponse } from '@/lib/types';
import { extractApiData } from '@/lib/api-utils';

export interface ManufacturerMedicineImportItem {
  medicineName?: string;
  wholesalePrice: number | string;
  moq?: number;
  listedQuantity?: number;
  prescriptionRequired?: boolean;
}

export interface ManufacturerMedicinesImportRequest {
  items: ManufacturerMedicineImportItem[];
}

export interface ManufacturerImportSummary {
  createdMedicines: number;
  updatedListings: number;
  createdListings: number;
  errors: string[];
  warnings?: string[];
}

export interface ManufacturerListingRow {
  listingId: string;
  medicineId: number;
  medicineName: string;
  wholesalePrice: string;
  moq: number;
  listedQuantity: number;
  currency: string;
  isActive: boolean;
  updatedAt: string;
}

export interface ManufacturerListResponse {
  items: ManufacturerListingRow[];
  total: number;
  page: number;
  limit: number;
  stats: {
    totalListings: number;
    activeListings: number;
    totalListedUnits: number;
  };
}

export const manufacturerApi = {
  listMedicines: async (page = 1, limit = 20, q?: string): Promise<ManufacturerListResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (q?.trim()) params.set("q", q.trim());
    const response = await api.get<ApiResponse<ManufacturerListResponse>>(
      `/manufacturer/medicines?${params.toString()}`
    );
    return extractApiData(response);
  },

  updateManufacturerListing: async (
    listingId: string,
    body: {
      wholesalePrice: string | number;
      moq: number;
      listedQuantity: number;
      isActive?: boolean;
    },
  ): Promise<ManufacturerListingRow> => {
    const response = await api.patch<ApiResponse<ManufacturerListingRow>>(
      `/manufacturer/medicines/${listingId}`,
      body,
    );
    return extractApiData(response);
  },

  importMedicines: async (body: ManufacturerMedicinesImportRequest): Promise<ManufacturerImportSummary> => {
    const response = await api.post<ApiResponse<ManufacturerImportSummary>>('/manufacturer/medicines/import', body);
    return extractApiData(response);
  },

  importMedicinesExcel: async (file: File): Promise<ManufacturerImportSummary> => {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<ApiResponse<ManufacturerImportSummary>>(
      '/manufacturer/medicines/import/excel',
      form
    );
    return extractApiData(response);
  },

  downloadImportTemplate: async (): Promise<Blob> => {
    const response = await api.get('/manufacturer/medicines/import/template', {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  listWholesaleOrders: async (page = 1, limit = 20, status?: string): Promise<ManufacturerWholesaleOrdersListResponse> => {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status?.trim()) q.set("status", status.trim());
    const response = await api.get<ApiResponse<ManufacturerWholesaleOrdersListResponse>>(
      `/manufacturer/wholesale/orders?${q.toString()}`,
    );
    return extractApiData(response);
  },

  getWholesaleOrderDetail: async (orderId: string): Promise<ManufacturerWholesaleOrderDetailResponse> => {
    const response = await api.get<ApiResponse<ManufacturerWholesaleOrderDetailResponse>>(
      `/manufacturer/wholesale/orders/${orderId}`,
    );
    return extractApiData(response);
  },

  patchWholesaleOrderStatus: async (orderId: string, status: string): Promise<WholesaleOrderSummaryRow> => {
    const response = await api.patch<ApiResponse<WholesaleOrderSummaryRow>>(
      `/manufacturer/wholesale/orders/${orderId}`,
      { status },
    );
    return extractApiData(response);
  },
};

export interface WholesaleOrderSummaryRow {
  id: string;
  manufacturerId: string;
  medicalStoreId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentProvider: string | null;
  gatewaySessionId: string | null;
  paidAt: string | null;
  currency: string;
  subtotal: string;
  total: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  medicalStoreName?: string;
}

export interface ManufacturerWholesaleOrdersListResponse {
  items: WholesaleOrderSummaryRow[];
  total: number;
  page: number;
  limit: number;
}

export interface WholesaleOrderItemDetail {
  id: string;
  manufacturerMedicineId: string;
  medicineId: number;
  medicineName: string;
  quantity: number;
  moqSnapshot: number;
  unitPrice: string;
  lineTotal: string;
}

export interface MedicalStoreContactBlock {
  storeName: string;
  addressLine: string;
  city: string;
  province: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
}

export interface ManufacturerWholesaleOrderDetailResponse {
  order: WholesaleOrderSummaryRow;
  items: WholesaleOrderItemDetail[];
  medicalStore: MedicalStoreContactBlock;
}

export default manufacturerApi;

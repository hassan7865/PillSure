import api from "@/lib/interceptor";
import { extractApiData } from "@/lib/api-utils";

export type CartItemPayload = {
  medicineId: number;
  quantity?: number;
  sourceType?: "direct" | "prescription";
  appointmentId?: string;
medicalStoreMedicineId?: string;
};

export type PharmacyAvailabilitySort = "availability" | "price";

export type PharmacyAvailabilityLine = {
  cartItemId: string;
  medicineId: number;
  medicineName: string;
  requestedQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  unitPrice: string | null;
  listingId: string | null;
  status: "full" | "partial" | "not_available";
};

export type PharmacyAvailabilityStore = {
  medicalStoreId: string;
  storeName: string;
  status: "full" | "partial" | "not_available";
  fullItemsCount: number;
  availableItemsCount: number;
  missingItemsCount: number;
  totalItemsCount: number;
  estimatedTotal: number;
  currency: string;
  items: PharmacyAvailabilityLine[];
};

export type PharmacyAvailabilityResponse = {
  cartId: string;
  requestedItems: Array<{
    cartItemId: string;
    medicineId: number;
    medicineName: string;
    requestedQuantity: number;
    sourceType: string;
    appointmentId: string | null;
  }>;
  stores: PharmacyAvailabilityStore[];
  sortBy: PharmacyAvailabilitySort;
  diagnostics?: {
    totalMedicinesRequested: number;
    medicinesWithListings: number;
    medicinesWithoutListings: number;
    missingMedicines: Array<{
      medicineId: number;
      medicineName: string;
      quantity: number;
    }>;
    totalStoresChecked: number;
    totalListingsFound: number;
    reason?: string;
  };
};

export type PrescriptionPharmacySelectionPayload = {
  appointmentId: string;
  medicalStoreId: string;
  selections: Array<{ cartItemId: string; quantity: number }>;
};

export type ApplyPharmacySelectionResponse = {
  cart: {
    cartId: string;
    items: Array<{
      id: string;
      medicineId: number;
      quantity: number;
      unitPrice: string;
      sourceType: string;
      appointmentId: string | null;
      medicalStoreMedicineId: string | null;
      medicineName: string;
      prescriptionRequired: boolean;
      medicalStoreName: string | null;
    }>;
    subtotal: number;
    total: number;
    currency: string;
  };
  selectedMedicalStoreId: string;
  removedItems: Array<{
    cartItemId: string;
    medicineId: number;
    medicineName: string;
    reason: string;
  }>;
};

export const cartApi = {
  getCart: async () => {
    const response = await api.get("/cart");
    return extractApiData(response);
  },
  addItem: async (payload: CartItemPayload) => {
    const response = await api.post("/cart/items", payload);
    const data = extractApiData(response);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart:updated"));
    }
    return data;
  },
  updateItem: async (itemId: string, quantity: number) => {
    const response = await api.patch(`/cart/items/${itemId}`, { quantity });
    const data = extractApiData(response);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart:updated"));
    }
    return data;
  },
  removeItem: async (itemId: string) => {
    const response = await api.delete(`/cart/items/${itemId}`);
    const data = extractApiData(response);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart:updated"));
    }
    return data;
  },
  getPharmacyAvailability: async (sortBy: PharmacyAvailabilitySort = "availability") => {
    const response = await api.get(`/cart/pharmacy-availability`, {
      params: { sortBy },
    });
    return extractApiData<PharmacyAvailabilityResponse>(response);
  },
  getPrescriptionPharmacyAvailability: async (appointmentId: string, sortBy: PharmacyAvailabilitySort = "availability") => {
    const response = await api.get(`/cart/pharmacy-selection/availability`, {
      params: { appointmentId, sortBy },
    });
    return extractApiData<PharmacyAvailabilityResponse>(response);
  },
  applyPharmacySelection: async (payload: {
    medicalStoreId: string;
    selections: Array<{ cartItemId: string; quantity: number }>;
  }) => {
    const response = await api.post(`/cart/pharmacy-selection`, payload);
    const data = extractApiData<ApplyPharmacySelectionResponse>(response);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart:updated"));
    }
    return data;
  },
  applyPrescriptionPharmacySelection: async (payload: PrescriptionPharmacySelectionPayload) => {
    const response = await api.post(`/cart/pharmacy-selection/appointment`, payload);
    const data = extractApiData<ApplyPharmacySelectionResponse>(response);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cart:updated"));
    }
    return data;
  },
};

export default cartApi;

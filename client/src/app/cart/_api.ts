import api from "@/lib/interceptor";
import { extractApiData } from "@/lib/api-utils";

export type CartItemPayload = {
  medicineId: number;
  quantity?: number;
  sourceType?: "direct" | "prescription";
  appointmentId?: string;
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
};

export default cartApi;

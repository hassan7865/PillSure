import api from "@/lib/interceptor";
import { extractApiData } from "@/lib/api-utils";

export const orderApi = {
  checkout: async (payload: {
    paymentMethod: "cod" | "online";
    addressId?: string;
    shippingAddress?: string;
    contactNo?: string;
  }) => {
    const response = await api.post("/orders/checkout", payload);
    return extractApiData(response);
  },
  getShippingAddresses: async () => {
    const response = await api.get("/orders/shipping-addresses");
    return extractApiData(response);
  },
  createShippingAddress: async (payload: {
    label: string;
    addressLine: string;
    contactNo: string;
    isDefault?: boolean;
  }) => {
    const response = await api.post("/orders/shipping-addresses", payload);
    return extractApiData(response);
  },
  updateShippingAddress: async (
    addressId: string,
    payload: { label?: string; addressLine?: string; contactNo?: string; isDefault?: boolean },
  ) => {
    const response = await api.put(`/orders/shipping-addresses/${addressId}`, payload);
    return extractApiData(response);
  },
  deleteShippingAddress: async (addressId: string) => {
    const response = await api.delete(`/orders/shipping-addresses/${addressId}`);
    return extractApiData(response);
  },
  getOrders: async () => {
    const response = await api.get("/orders");
    return extractApiData(response);
  },
  getOrderById: async (orderId: string) => {
    const response = await api.get(`/orders/${orderId}`);
    return extractApiData(response);
  },
};

export default orderApi;

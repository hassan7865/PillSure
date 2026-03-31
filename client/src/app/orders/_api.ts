import api from "@/lib/interceptor";
import { extractApiData } from "@/lib/api-utils";

export const orderApi = {
  checkout: async (payload: { paymentMethod: "cod" | "online"; shippingAddress?: string; contactNo?: string }) => {
    const response = await api.post("/orders/checkout", payload);
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

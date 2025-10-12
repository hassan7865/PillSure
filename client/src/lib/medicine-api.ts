import api from './interceptor';
import { ApiResponse } from './types';

export type Medicine = {
  id: number;
  medicineName: string;
  medicineUrl?: string | null;
  price?: string | null; // numeric comes as string from PG
  discount?: string | null;
  stock?: number | null;
  images?: any | null; // array of urls or objects
  prescriptionRequired?: boolean | null;
  createdAt?: string | null;
  drugDescription?: string | null;
  drugCategory?: string | null;
  drugVarient?: string | null;
};

export const medicineApi = {
  getFeatured: async (params?: { limit?: number; category?: string; uniqueCategories?: boolean }): Promise<Medicine[]> => {
    const search = new URLSearchParams();
    if (params?.limit) search.set('limit', String(params.limit));
    if (params?.category) search.set('category', params.category);
    if (params?.uniqueCategories !== undefined) search.set('uniqueCategories', String(params.uniqueCategories));
    else search.set('uniqueCategories', 'true');

    const qs = search.toString();
    const url = `/medicine/featured${qs ? `?${qs}` : ''}`;
    const res = await api.get<ApiResponse<Medicine[]>>(url);
    return res.data.data || [];
  },
};

export default medicineApi;

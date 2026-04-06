import { AxiosResponse } from 'axios';
import { ApiResponse } from './types';
export function extractApiData<T>(response: AxiosResponse<ApiResponse<T>>): T {
  const data = response.data.data;
  if (data === null || data === undefined) {
    throw new Error('No data returned from API');
  }
  return data;
}
export function extractApiDataWithFallback<T>(
  response: AxiosResponse<ApiResponse<T>>,
  fallback: T
): T {
  return response.data.data ?? fallback;
}
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null | string[]>): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // For arrays, join with comma or add multiple params
        if (value.length > 0) {
          searchParams.set(key, value.join(','));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
export function buildQueryParams(params: Record<string, string | number | boolean | undefined | null | string[]>): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          searchParams.set(key, value.join(','));
        }
      } else {
        searchParams.set(key, String(value));
      }
    }
  });
  
  return searchParams;
}
export function buildStatusParam(status?: string): string {
  return status && status.trim() ? `?status=${status.trim()}` : '';
}

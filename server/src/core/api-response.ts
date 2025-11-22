import { ApiResponse as ApiResponseType } from './types';
export function ApiResponse<T = any>(data?: T | null, message?: string): ApiResponseType<T> {
  return {
    ...(data !== null && data !== undefined && { data }),
    status: 'success',
    ...(message && { message }),
  };
}


export function ApiError(error: string, message?: string): ApiResponseType {
  return {
    status: 'error',
    error,
    ...(message && { message }),
  };
}


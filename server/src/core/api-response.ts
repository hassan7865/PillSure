// =============================================================================
// STANDARDIZED API RESPONSE TYPES
// =============================================================================

/**
 * Standard API Response Structure
 * Simple and consistent format for all endpoints
 */
export interface ApiResponse<T = any> {
  data?: T;
  status: 'success' | 'error';
  error?: string;
  message?: string;
}

/**
 * Success Response Helper
 */
export const createSuccessResponse = <T>(
  data: T,
  message?: string
): ApiResponse<T> => ({
  data,
  status: 'success',
  message
});

/**
 * Error Response Helper
 */
export const createErrorResponse = (
  error: string,
  message?: string
): ApiResponse => ({
  status: 'error',
  error,
  message
});

/**
 * Utility function to extract error messages consistently across the application
 * Handles various error formats from different sources (Axios, API responses, etc.)
 */
export const getErrorMessage = (error: any): string => {
  // Check for server response error message (most specific)
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for server response error (fallback)
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Check for generic error message
  if (error?.message) {
    return error.message;
  }
  
  // Check for string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Default fallback
  return 'An error occurred';
};

/**
 * Helper to format error messages for display
 */
export const formatErrorMessage = (error: any, defaultMessage: string = 'An error occurred'): string => {
  const message = getErrorMessage(error);
  return message || defaultMessage;
};

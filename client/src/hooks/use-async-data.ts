/**
 * Custom hook for async data fetching with loading and error states
 * Includes automatic cleanup to prevent state updates on unmounted components
 */
import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseAsyncDataOptions<T> {
  /**
   * Initial data value
   */
  initialData?: T | null;
  /**
   * Whether to fetch immediately on mount
   * @default true
   */
  immediate?: boolean;
  /**
   * Dependency array for refetching
   */
  deps?: React.DependencyList;
}

export interface UseAsyncDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setData: (data: T | null) => void;
  setError: (error: Error | null) => void;
}

/**
 * Custom hook for async data fetching
 * 
 * @param fetchFn - Async function that returns the data
 * @param options - Options for the hook
 * @returns Object with data, loading state, error, and refetch function
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useAsyncData(
 *   () => api.getDoctors(),
 *   { immediate: true }
 * );
 * ```
 */
export function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  options: UseAsyncDataOptions<T> = {}
): UseAsyncDataResult<T> {
  const {
    initialData = null,
    immediate = true,
    deps = [],
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await fetchFn();
      
      if (isMountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('An error occurred'));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [fetchFn]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (immediate) {
      fetchData();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [immediate, fetchData, ...deps]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch,
    setData,
    setError,
  };
}

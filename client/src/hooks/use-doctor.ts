import { useQuery } from '@tanstack/react-query';
import { doctorApi, Specialization, ApiResponse } from '@/lib/doctor-api';

// Hook to get all specializations
export const useSpecializations = () => {
  return useQuery<ApiResponse<Specialization[]>>({
    queryKey: ['specializations'],
    queryFn: () => doctorApi.getSpecializations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};



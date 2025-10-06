import { useQuery } from '@tanstack/react-query';
import { doctorApi } from '@/lib/doctor-api';
import { Specialization } from '@/lib/types';

// Hook to get all specializations
export const useSpecializations = () => {
  return useQuery<Specialization[]>({
    queryKey: ['specializations'],
    queryFn: () => doctorApi.getSpecializations(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Hook to get doctors with search and filters (Load More functionality)
export const useDoctors = (
  page: number = 1,
  limit: number = 10,
  specializationIds: string[] = [],
  search: string = ''
) => {
  return useQuery({
    queryKey: ['doctors', page, limit, specializationIds, search],
    queryFn: () => doctorApi.getDoctors(page, limit, specializationIds, search),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Only keep previous data when loading more (page > 1), not for new searches
    placeholderData: (previousData, previousQuery) => {
      // If it's a new search/filter (page 1), don't use placeholder data
      if (page === 1) return undefined;
      // If it's loading more (page > 1), keep previous data
      return previousData;
    },
  });
};



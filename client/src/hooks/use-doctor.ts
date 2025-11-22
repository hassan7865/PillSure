import { useState, useEffect } from 'react';
import api from '@/lib/interceptor';
import { Specialization, Doctor, ApiResponse } from '@/lib/types';

// Hook to get all specializations
export const useSpecializations = () => {
  const [data, setData] = useState<Specialization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchSpecializations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<ApiResponse<Specialization[]>>('/doctor/specializations');
        if (isMounted) {
          setData(response.data.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch specializations'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSpecializations();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, isLoading, error };
};

// Hook to get doctors with search and filters (Load More functionality)
export const useDoctors = (
  page: number = 1,
  limit: number = 10,
  specializationIds: string[] = [],
  search: string = ''
) => {
  const [data, setData] = useState<{ doctors: Doctor[]; pagination: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDoctors = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(specializationIds.length > 0 && { specializationIds: specializationIds.join(',') })
        });
        
        const response = await api.get<ApiResponse<{ doctors: any[]; pagination: any }>>(
          `/doctor/search-doctors?${params}`
        );
        
        const rawData = response.data.data || { doctors: [], pagination: {} };
        
        // Transform the raw doctor data to match our UI expectations
        const transformedDoctors: Doctor[] = rawData.doctors.map((doctor: any) => {
          // Get primary specialization name from the backend data
          const primarySpecializationName = doctor.primarySpecialization?.name || 
            doctor.specializations?.[0]?.name || 
            `Specialization ${doctor.specializationIds[0] || 'N/A'}`;
          
          return {
            ...doctor,
            // Add computed fields for UI compatibility
            name: `${doctor.firstName} ${doctor.lastName}`,
            specialization: primarySpecializationName,
            experience: doctor.experienceYears,
            fee: parseFloat(doctor.feePkr),
            rating: parseFloat(doctor.patientSatisfactionRate),
          };
        });
        
        if (isMounted) {
          setData({
            doctors: transformedDoctors,
            pagination: rawData.pagination
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch doctors'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchDoctors();

    return () => {
      isMounted = false;
    };
  }, [page, limit, JSON.stringify(specializationIds), search]);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search }),
        ...(specializationIds.length > 0 && { specializationIds: specializationIds.join(',') })
      });
      
      const response = await api.get<ApiResponse<{ doctors: any[]; pagination: any }>>(
        `/doctor/search-doctors?${params}`
      );
      
      const rawData = response.data.data || { doctors: [], pagination: {} };
      
      const transformedDoctors: Doctor[] = rawData.doctors.map((doctor: any) => {
        const primarySpecializationName = doctor.primarySpecialization?.name || 
          doctor.specializations?.[0]?.name || 
          `Specialization ${doctor.specializationIds[0] || 'N/A'}`;
        
        return {
          ...doctor,
          name: `${doctor.firstName} ${doctor.lastName}`,
          specialization: primarySpecializationName,
          experience: doctor.experienceYears,
          fee: parseFloat(doctor.feePkr),
          rating: parseFloat(doctor.patientSatisfactionRate),
        };
      });
      
      setData({
        doctors: transformedDoctors,
        pagination: rawData.pagination
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch doctors'));
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
};

// Hook to get current doctor profile
export const useCurrentDoctor = () => {
  const [data, setData] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchCurrentDoctor = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await api.get<ApiResponse<Doctor>>('/doctor/me');
        if (!response.data.data) {
          throw new Error('Doctor profile not found');
        }
        if (isMounted) {
          setData(response.data.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch doctor profile'));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCurrentDoctor();

    return () => {
      isMounted = false;
    };
  }, []);

  const refetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get<ApiResponse<Doctor>>('/doctor/me');
      if (!response.data.data) {
        throw new Error('Doctor profile not found');
      }
      setData(response.data.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch doctor profile'));
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch };
};



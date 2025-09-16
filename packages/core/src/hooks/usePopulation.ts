import { useQuery } from '@tanstack/react-query';
import { getPopulation } from '../services/api';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

export const usePopulation = (populationId: string) => {
  const config = useSyntheaConfig();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['population', populationId],
    queryFn: () => getPopulation(config.apiUrl, populationId),
    enabled: !!populationId,
    refetchInterval: (data) => {
      // Poll while generating
      if (data?.status === 'generating' || data?.status === 'pending') {
        return 2000; // Poll every 2 seconds
      }
      return false;
    },
  });

  return {
    population: data,
    isLoading,
    error,
    refetch,
  };
};
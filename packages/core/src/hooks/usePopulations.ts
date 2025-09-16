import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import * as api from '../services/api';

export interface Population {
  id: string;
  name: string;
  description?: string;
  patient_count: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  config: any;
  created_at: string;
  completed_at?: string;
}

export const usePopulations = () => {
  const config = useSyntheaConfig();
  const queryClient = useQueryClient();

  const { data: populations = [], isLoading, error } = useQuery<Population[], Error>({
    queryKey: ['populations'],
    queryFn: () => api.getPopulations(config.apiUrl),
    refetchInterval: 5000, // Refetch every 5 seconds to update status
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePopulation(config.apiUrl, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['populations'] });
    },
    onError: (error) => {
      config.callbacks.onError?.(error as Error);
    },
  });

  return {
    populations,
    isLoading,
    error,
    deletePopulation: deleteMutation.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['populations'] }),
  };
};
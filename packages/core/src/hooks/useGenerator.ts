import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import * as api from '../services/api';

interface GeneratePopulationParams {
  name: string;
  description?: string;
  size: number;
  config: {
    state?: string;
    city?: string;
    age_range?: [number, number];
    gender?: string;
    modules?: string[];
  };
}

export const useGenerator = () => {
  const config = useSyntheaConfig();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (params: GeneratePopulationParams) => {
      // First create the population
      const population = await api.createPopulation(config.apiUrl, params);

      // Then immediately start generation
      try {
        await api.startGeneration(config.apiUrl, population.id);
      } catch (error) {
        console.error('Failed to start generation:', error);
      }

      return population;
    },
    onSuccess: (population) => {
      queryClient.invalidateQueries({ queryKey: ['populations'] });
      config.callbacks.onPopulationCreated?.(population);
    },
    onError: (error) => {
      config.callbacks.onError?.(error as Error);
    },
  });

  return {
    generatePopulation: generateMutation.mutateAsync,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error,
  };
};
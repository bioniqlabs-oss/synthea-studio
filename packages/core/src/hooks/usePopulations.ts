import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import * as api from '../services/api';
import { useEffect, useRef } from 'react';
import { Population } from '../types';

export const usePopulations = () => {
  const config = useSyntheaConfig();
  const queryClient = useQueryClient();
  const websockets = useRef<Map<string, api.ProgressWebSocket>>(new Map());

  const { data: populations = [], isLoading, error, refetch } = useQuery<Population[], Error>(
    ['populations'],
    () => api.getPopulations(config.apiUrl),
    {
      refetchInterval: 10000, // Reduced frequency since we have WebSocket updates
    }
  );

  const deleteMutation = useMutation(
    (id: string) => api.deletePopulation(config.apiUrl, id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['populations']);
      },
      onError: (error) => {
        config.callbacks.onError?.(error as Error);
      },
    }
  );

  // Set up WebSocket connections for generating populations
  useEffect(() => {
    const populationList = Array.isArray(populations) ? populations : [];
    const generatingPops = populationList.filter(p => {
      const status = p.status?.toLowerCase();
      return status === 'generating' || status === 'pending';
    });

    // Connect WebSockets for generating populations
    generatingPops.forEach(pop => {
      if (!websockets.current.has(pop.id)) {
        const ws = new api.ProgressWebSocket();
        const wsUrl = config.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');

        ws.connect(wsUrl, pop.id, {
          onProgress: (data) => {
            // Update the population in cache with progress
            queryClient.setQueryData(['populations'], (old: Population[] = []) => {
              return old.map(p =>
                p.id === pop.id
                  ? { ...p, progress: data.progress, status: data.status || p.status }
                  : p
              );
            });
          },
          onComplete: () => {
            // Refetch to get final status
            refetch();
            // Clean up WebSocket
            websockets.current.get(pop.id)?.disconnect();
            websockets.current.delete(pop.id);
          },
          onError: (error) => {
            console.error('WebSocket error for population', pop.id, ':', error);
          }
        });

        websockets.current.set(pop.id, ws);
      }
    });

    // Clean up WebSockets for completed/failed populations
    websockets.current.forEach((ws, id) => {
      const pop = populations.find(p => p.id === id);
      if (!pop) {
        ws.disconnect();
        websockets.current.delete(id);
      } else {
        const status = pop.status.toLowerCase();
        if (status !== 'generating' && status !== 'pending') {
          ws.disconnect();
          websockets.current.delete(id);
        }
      }
    });

    // Cleanup on unmount
    return () => {
      if (populations.length === 0) {
        websockets.current.forEach(ws => ws.disconnect());
        websockets.current.clear();
      }
    };
  }, [populations, config.apiUrl, queryClient, refetch]);

  return {
    populations,
    isLoading,
    error,
    deletePopulation: deleteMutation.mutate,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['populations'] }),
  };
};
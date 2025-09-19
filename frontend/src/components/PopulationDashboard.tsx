/**
 * Population Dashboard Component
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { populationApi } from '../services/api';
import { usePopulationProgress } from '../services/websocket';
import PopulationForm from './PopulationForm';
import PopulationList from './PopulationList';
import PopulationDetails from './PopulationDetails';

export default function PopulationDashboard() {
  const [selectedPopulation, setSelectedPopulation] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch populations
  const { data: populations, isLoading, error } = useQuery({
    queryKey: ['populations'],
    queryFn: () => populationApi.list(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Create population mutation
  const createMutation = useMutation({
    mutationFn: populationApi.create,
    onSuccess: (data) => {
      toast.success(`Population "${data.name}" created`);
      queryClient.invalidateQueries({ queryKey: ['populations'] });
      setSelectedPopulation(data.id);
      setShowCreateForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create population');
    },
  });

  // Delete population mutation
  const deleteMutation = useMutation({
    mutationFn: populationApi.delete,
    onSuccess: () => {
      toast.success('Population deleted');
      queryClient.invalidateQueries({ queryKey: ['populations'] });
      setSelectedPopulation(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to delete population');
    },
  });

  // Get selected population details
  const selectedPopulationData = populations?.populations?.find(
    (p: any) => p.id === selectedPopulation
  );

  // WebSocket progress for selected population (only if generating)
  const { progress, message, error: wsError, isComplete } = usePopulationProgress(
    selectedPopulationData?.status === 'GENERATING' ? selectedPopulation : null
  );

  // Handle population selection
  const handleSelectPopulation = (id: string) => {
    setSelectedPopulation(id === selectedPopulation ? null : id);
  };

  // Handle create population
  const handleCreatePopulation = (data: any) => {
    createMutation.mutate(data);
  };

  // Handle delete population
  const handleDeletePopulation = (id: string) => {
    if (confirm('Are you sure you want to delete this population?')) {
      deleteMutation.mutate(id);
    }
  };

  // Handle manual import
  const handleManualImport = async (id: string, outputPath: string) => {
    try {
      await populationApi.import(id, outputPath);
      toast.success('Import started');
      queryClient.invalidateQueries({ queryKey: ['populations'] });
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start import');
    }
  };

  // Handle export
  const handleExport = async (id: string, format: 'fhir' | 'csv' | 'ccda' | 'ndjson') => {
    try {
      await populationApi.export(id, format);
      toast.success(`Exported ${format.toUpperCase()} data`);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to export');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading populations: {(error as any).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Population Dashboard</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
        >
          Create Population
        </button>
      </div>

      {/* Create Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create New Population</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <PopulationForm
              onSubmit={handleCreatePopulation}
              onCancel={() => setShowCreateForm(false)}
              isLoading={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Progress Bar for Active Generation */}
      {selectedPopulation && !isComplete && progress > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="mb-2 flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700">
              Generation Progress
            </span>
            <span className="text-sm text-blue-600">{progress}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          {message && (
            <p className="mt-2 text-sm text-blue-600">{message}</p>
          )}
          {wsError && (
            <p className="mt-2 text-sm text-red-600">{wsError}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Population List */}
        <div className="lg:col-span-1">
          <PopulationList
            populations={populations?.populations || []}
            selectedId={selectedPopulation}
            onSelect={handleSelectPopulation}
            onDelete={handleDeletePopulation}
          />
        </div>

        {/* Population Details */}
        <div className="lg:col-span-2">
          {selectedPopulation ? (
            <PopulationDetails
              populationId={selectedPopulation}
              onImport={handleManualImport}
              onExport={handleExport}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
              Select a population to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
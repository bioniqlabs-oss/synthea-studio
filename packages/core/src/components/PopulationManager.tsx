import React from 'react';
import { usePopulations } from '../hooks/usePopulations';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import { startGeneration } from '../services/api';

interface PopulationManagerProps {
  onSelectPopulation?: (id: string) => void;
}

export const PopulationManager: React.FC<PopulationManagerProps> = ({ onSelectPopulation }) => {
  const config = useSyntheaConfig();
  const { populations, isLoading, error, deletePopulation, refetch } = usePopulations();

  const handleStartGeneration = async (populationId: string) => {
    try {
      await startGeneration(config.apiUrl, populationId);
      refetch(); // Refresh the list to show updated status
    } catch (error) {
      console.error('Failed to start generation:', error);
      config.callbacks.onError?.(error as Error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading populations: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Populations</h2>
        <div className="text-sm text-gray-500">
          {populations.length} population{populations.length !== 1 && 's'}
        </div>
      </div>

      {populations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No populations yet</p>
          {config.features.allowCreate && (
            <p className="text-sm text-gray-400 mt-2">
              Go to the Generate tab to create your first population
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {populations.map((population) => (
            <div
              key={population.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectPopulation?.(population.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">{population.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    population.status.toLowerCase() === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : population.status.toLowerCase() === 'generating'
                      ? 'bg-blue-100 text-blue-800'
                      : population.status.toLowerCase() === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {population.status}
                </span>
              </div>

              <div className="text-sm text-gray-600 space-y-1">
                <p>Size: {population.patient_count} patients</p>
                <p>Created: {new Date(population.created_at).toLocaleDateString()}</p>
                {population.description && (
                  <p className="text-gray-500 truncate">{population.description}</p>
                )}
                {population.status.toLowerCase() === 'generating' && population.progress !== undefined && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Progress</span>
                      <span>{population.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${population.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {population.status.toLowerCase() === 'pending' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartGeneration(population.id);
                    }}
                    className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Start Generation
                  </button>
                )}
                {config.features.allowExport && population.status.toLowerCase() === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      config.callbacks.onExportRequested?.(population);
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Export
                  </button>
                )}
                {config.features.allowDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePopulation(population.id);
                    }}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
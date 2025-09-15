import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { populationApi, ProgressWebSocket } from '../services/api';
import { formatDateTime } from '../utils/dateFormat';

export default function PopulationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<{ progress: number; message: string } | null>(null);

  const { data: population, isLoading, error, refetch } = useQuery({
    queryKey: ['population', id],
    queryFn: () => populationApi.get(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll every 5 seconds if generating
      return query.state.data?.status === 'GENERATING' ? 5000 : false;
    }
  });

  // WebSocket connection for real-time progress
  useEffect(() => {
    if (population?.status === 'GENERATING' && id) {
      const websocket = new ProgressWebSocket();
      websocket.connect(id, {
        onProgress: (data) => {
          setProgress(data);
          if (data.progress === 100) {
            refetch();
          }
        },
        onError: (error) => {
          console.error('WebSocket error:', error);
        },
        onComplete: () => {
          refetch();
        }
      });

      return () => {
        websocket.disconnect();
      };
    }
  }, [population?.status, id, refetch]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !population) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading population details</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-2 text-sm text-red-600 hover:text-red-500"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  const statusColors = {
    PENDING: 'bg-gray-100 text-gray-800',
    GENERATING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{population.name}</h2>
            <p className="mt-1 text-sm text-gray-600">
              {population.description || 'No description provided'}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[population.status]}`}>
            {population.status}
          </span>
        </div>
      </div>

      {/* Progress Bar (if generating) */}
      {population.status === 'GENERATING' && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generation Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{progress?.message || 'Initializing...'}</span>
                <span>{progress?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progress?.progress || 0}%` }}
                ></div>
              </div>
            </div>
            
            <button
              onClick={() => populationApi.stopGeneration(id!)}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              Stop Generation
            </button>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Population Details</h3>
        
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{population.id}</dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Patient Count</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {population.patient_count.toLocaleString()} patients
            </dd>
          </div>
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Created</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {formatDateTime(population.created_at)}
            </dd>
          </div>
          
          {population.completed_at && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Completed</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {formatDateTime(population.completed_at)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Configuration */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
        
        <div className="space-y-4">
          {population.config.modules && population.config.modules.length > 0 && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Disease Modules</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {population.config.modules.map(module => (
                  <span key={module} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {module}
                  </span>
                ))}
              </dd>
            </div>
          )}
          
          {population.config.age_range && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Age Range</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {population.config.age_range[0]} - {population.config.age_range[1]} years
              </dd>
            </div>
          )}
          
          {population.config.gender_distribution && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Gender Distribution</dt>
              <dd className="mt-1 text-sm text-gray-900">
                Male: {Math.round((population.config.gender_distribution.M || 0) * 100)}%, 
                Female: {Math.round((population.config.gender_distribution.F || 0) * 100)}%
              </dd>
            </div>
          )}
          
          <div>
            <dt className="text-sm font-medium text-gray-500">Export Formats</dt>
            <dd className="mt-1 flex gap-2">
              {population.config.export_fhir && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  FHIR
                </span>
              )}
              {population.config.export_csv && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  CSV
                </span>
              )}
              {population.config.export_ccda && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  C-CDA
                </span>
              )}
            </dd>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Dashboard
        </button>
        
        {population.status === 'PENDING' && (
          <button
            onClick={() => populationApi.startGeneration(id!).then(() => refetch())}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Start Generation
          </button>
        )}
        
        {population.status === 'COMPLETED' && (
          <>
            <button
              onClick={async () => {
                try {
                  await populationApi.export(id!, 'fhir');
                  // The export opens in a new window/downloads directly
                } catch (error) {
                  alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                }
              }}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              Export FHIR
            </button>
            {population.config.export_csv && (
              <button
                onClick={async () => {
                  try {
                    await populationApi.export(id!, 'csv');
                    // The export opens in a new window/downloads directly
                  } catch (error) {
                    alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Export CSV
              </button>
            )}
            {population.config.export_ccda && (
              <button
                onClick={async () => {
                  try {
                    await populationApi.export(id!, 'ccda');
                    // The export opens in a new window/downloads directly
                  } catch (error) {
                    alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
                  }
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                Export C-CDA
              </button>
            )}
          </>
        )}
        
        <button
          onClick={async () => {
            if (confirm('Delete this population? This cannot be undone.')) {
              try {
                await populationApi.delete(id!);
                navigate('/');
              } catch (error) {
                console.error('Failed to delete population:', error);
                alert(`Failed to delete population: ${error instanceof Error ? error.message : 'Unknown error'}`);
              }
            }
          }}
          disabled={population.status === 'GENERATING'}
          className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Delete Population
        </button>
      </div>
    </div>
  );
}
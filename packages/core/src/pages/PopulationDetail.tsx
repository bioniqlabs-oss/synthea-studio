import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getPopulation,
  deletePopulation,
  startGeneration,
  stopGeneration,
  exportPopulation,
  ProgressWebSocket
} from '../services/api';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

export default function PopulationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const config = useSyntheaConfig();
  const [progress, setProgress] = useState<{ progress: number; message: string } | null>(null);

  const { data: population, isLoading, error, refetch } = useQuery({
    queryKey: ['population', id],
    queryFn: () => getPopulation(config.apiUrl, id!),
    enabled: !!id,
    refetchInterval: (query) => {
      // Poll every 5 seconds if generating
      return query.state.data?.status === 'GENERATING' ? 5000 : false;
    }
  });

  // WebSocket connection for real-time progress
  useEffect(() => {
    if (population?.status === 'GENERATING' && id) {
      const wsUrl = config.apiUrl.replace('http://', 'ws://').replace('https://', 'wss://');
      const websocket = new ProgressWebSocket();

      websocket.connect(wsUrl, id, {
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
  }, [population?.status, id, config.apiUrl, refetch]);

  const startMutation = useMutation({
    mutationFn: () => startGeneration(config.apiUrl, id!),
    onSuccess: () => refetch(),
  });

  const stopMutation = useMutation({
    mutationFn: () => stopGeneration(config.apiUrl, id!),
    onSuccess: () => refetch(),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePopulation(config.apiUrl, id!),
    onSuccess: () => navigate('/'),
  });

  const handleExport = (format: 'fhir' | 'csv' | 'ccda' | 'ndjson') => {
    const url = exportPopulation(config.apiUrl, id!, format);
    window.open(url, '_blank');
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${population?.name}"?`)) {
      deleteMutation.mutate();
    }
  };

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
        <p className="text-red-800">Error loading population: {(error as Error)?.message || 'Not found'}</p>
        <button onClick={() => navigate('/')} className="mt-2 text-sm text-red-600 hover:text-red-500">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    GENERATING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back to Dashboard
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{population.name}</h2>
            {population.description && (
              <p className="mt-1 text-gray-600">{population.description}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              statusColors[population.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {population.status}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {population.status === 'GENERATING' && (
        <div className="mb-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generation Progress</h3>
          <div className="space-y-3">
            <div className="relative">
              <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                <div
                  style={{ width: `${progress?.progress || 0}%` }}
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{progress?.message || 'Generating...'}</span>
              <span className="font-medium">{progress?.progress || 0}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Population Info */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Population Details</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Patient Count</dt>
              <dd className="text-sm font-medium text-gray-900">{population.patient_count.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(population.created_at)}</dd>
            </div>
            {population.completed_at && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(population.completed_at)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Population ID</dt>
              <dd className="text-sm font-mono text-gray-900">{population.id}</dd>
            </div>
          </dl>
        </div>

        {/* Configuration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Configuration</h3>
          <dl className="space-y-3">
            {population.config.age_range && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Age Range</dt>
                <dd className="text-sm font-medium text-gray-900">
                  {population.config.age_range[0]} - {population.config.age_range[1]} years
                </dd>
              </div>
            )}
            {population.config.gender_distribution && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Gender Distribution</dt>
                <dd className="text-sm font-medium text-gray-900">
                  M: {(population.config.gender_distribution.M * 100).toFixed(0)}% /
                  F: {(population.config.gender_distribution.F * 100).toFixed(0)}%
                </dd>
              </div>
            )}
            {population.config.state && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">State</dt>
                <dd className="text-sm font-medium text-gray-900">{population.config.state}</dd>
              </div>
            )}
            {population.config.city && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">City</dt>
                <dd className="text-sm font-medium text-gray-900">{population.config.city}</dd>
              </div>
            )}
          </dl>

          {population.config.modules && population.config.modules.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Disease Modules</h4>
              <div className="flex flex-wrap gap-2">
                {population.config.modules.map((module: string) => (
                  <span
                    key={module}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                  >
                    {module.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>

        <div className="flex flex-wrap gap-4">
          {/* Generation Controls */}
          {population.status === 'PENDING' && (
            <button
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isPending}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {startMutation.isPending ? 'Starting...' : 'Start Generation'}
            </button>
          )}

          {population.status === 'GENERATING' && (
            <button
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isPending}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              {stopMutation.isPending ? 'Stopping...' : 'Stop Generation'}
            </button>
          )}

          {/* Export Options */}
          {population.status === 'COMPLETED' && (
            <>
              <button
                onClick={() => handleExport('fhir')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as FHIR
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('ccda')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as C-CDA
              </button>
              <button
                onClick={() => handleExport('ndjson')}
                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Export as NDJSON
              </button>
            </>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="ml-auto px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete Population'}
          </button>
        </div>
      </div>
    </div>
  );
}
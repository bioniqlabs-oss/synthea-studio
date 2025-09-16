import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getPopulations } from '../services/api';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import PopulationCard from '../components/PopulationCard';

export default function Dashboard() {
  const config = useSyntheaConfig();
  const { data: populations, isLoading, error, refetch } = useQuery({
    queryKey: ['populations'],
    queryFn: () => getPopulations(config.apiUrl),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading populations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading populations: {(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="mt-2 text-sm text-red-600 hover:text-red-500"
        >
          Try again
        </button>
      </div>
    );
  }

  const populationsByStatus = {
    pending: populations?.filter(p => p.status === 'PENDING') || [],
    generating: populations?.filter(p => p.status === 'GENERATING') || [],
    completed: populations?.filter(p => p.status === 'COMPLETED') || [],
    failed: populations?.filter(p => p.status === 'FAILED') || [],
  };

  const stats = {
    total: populations?.length || 0,
    totalPatients: populations?.reduce((sum, p) => sum + p.patient_count, 0) || 0,
    generating: populationsByStatus.generating.length,
    completed: populationsByStatus.completed.length,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Population Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage and monitor your synthetic patient populations
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Populations
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Patients
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.totalPatients.toLocaleString()}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Generating
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-blue-600">{stats.generating}</dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Completed
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.completed}</dd>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <Link
          to="/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Create New Population
        </Link>
        <Link
          to="/templates"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Browse Templates
        </Link>
      </div>

      {/* Populations by Status */}
      {populationsByStatus.generating.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Currently Generating</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {populationsByStatus.generating.map((population) => (
              <PopulationCard key={population.id} population={population} onDelete={refetch} />
            ))}
          </div>
        </div>
      )}

      {populationsByStatus.pending.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pending</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {populationsByStatus.pending.map((population) => (
              <PopulationCard key={population.id} population={population} onDelete={refetch} />
            ))}
          </div>
        </div>
      )}

      {populationsByStatus.completed.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Completed</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {populationsByStatus.completed.map((population) => (
              <PopulationCard key={population.id} population={population} onDelete={refetch} />
            ))}
          </div>
        </div>
      )}

      {populationsByStatus.failed.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Failed</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {populationsByStatus.failed.map((population) => (
              <PopulationCard key={population.id} population={population} onDelete={refetch} />
            ))}
          </div>
        </div>
      )}

      {populations?.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500">No populations yet. Create your first population to get started.</p>
          <Link
            to="/new"
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            Create Population
          </Link>
        </div>
      )}
    </div>
  );
}
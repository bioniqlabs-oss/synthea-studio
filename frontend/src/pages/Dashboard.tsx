import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { populationApi } from '../services/api';
import PopulationCard from '../components/PopulationCard';

export default function Dashboard() {
  const { data: populations, isLoading, error, refetch } = useQuery({
    queryKey: ['populations'],
    queryFn: () => populationApi.list(),
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
    pending: populations?.filter(p => p.status === 'pending') || [],
    generating: populations?.filter(p => p.status === 'generating') || [],
    completed: populations?.filter(p => p.status === 'completed') || [],
    failed: populations?.filter(p => p.status === 'failed') || [],
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Total Populations
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {stats.total}
            </dd>
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
            <dd className="mt-1 text-3xl font-semibold text-blue-600">
              {stats.generating}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">
              Completed
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">
              {stats.completed}
            </dd>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4 mb-8">
        <Link
          to="/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          New Population
        </Link>
        <Link
          to="/templates"
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Browse Templates
        </Link>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Populations List */}
      {populations?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No populations</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new population or using a template.
          </p>
          <div className="mt-6">
            <Link
              to="/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create your first population
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active/Generating */}
          {populationsByStatus.generating.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Currently Generating
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {populationsByStatus.generating.map((population) => (
                  <PopulationCard 
                    key={population.id} 
                    population={population}
                    onDelete={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Pending */}
          {populationsByStatus.pending.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Pending
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {populationsByStatus.pending.map((population) => (
                  <PopulationCard 
                    key={population.id} 
                    population={population}
                    onDelete={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed */}
          {populationsByStatus.completed.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Completed
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {populationsByStatus.completed.map((population) => (
                  <PopulationCard 
                    key={population.id} 
                    population={population}
                    onDelete={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Failed */}
          {populationsByStatus.failed.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Failed
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {populationsByStatus.failed.map((population) => (
                  <PopulationCard 
                    key={population.id} 
                    population={population}
                    onDelete={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
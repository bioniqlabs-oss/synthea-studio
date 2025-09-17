import React from 'react';
import { usePopulations } from '../hooks/usePopulations';

interface StatisticsViewProps {
  onSelectPopulation?: (id: string) => void;
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ onSelectPopulation }) => {
  const { populations, isLoading } = usePopulations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  const populationList = Array.isArray(populations) ? populations : [];

  const stats = {
    total: populationList.length,
    totalPatients: populationList.reduce((sum, p) => sum + (p.patient_count || 0), 0),
    pending: populationList.filter(p => p.status?.toLowerCase() === 'pending').length,
    generating: populationList.filter(p => p.status?.toLowerCase() === 'generating').length,
    completed: populationList.filter(p => p.status?.toLowerCase() === 'completed').length,
    failed: populationList.filter(p => p.status?.toLowerCase() === 'failed').length,
  };

  const populationsByStatus = {
    generating: populationList.filter(p => p.status?.toLowerCase() === 'generating'),
    pending: populationList.filter(p => p.status?.toLowerCase() === 'pending'),
    completed: populationList.filter(p => p.status?.toLowerCase() === 'completed'),
    failed: populationList.filter(p => p.status?.toLowerCase() === 'failed'),
  };

  return (
    <div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Populations</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Patients</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.totalPatients.toLocaleString()}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Generating</dt>
                  <dd className="text-lg font-semibold text-blue-600">{stats.generating}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Completed</dt>
                  <dd className="text-lg font-semibold text-green-600">{stats.completed}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Population Groups */}
      <div className="space-y-6">
        {stats.generating > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Currently Generating</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {populationsByStatus.generating.map(pop => (
                <PopulationCard key={pop.id} population={pop} onClick={() => onSelectPopulation?.(pop.id)} />
              ))}
            </div>
          </div>
        )}

        {stats.pending > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Pending</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {populationsByStatus.pending.map(pop => (
                <PopulationCard key={pop.id} population={pop} onClick={() => onSelectPopulation?.(pop.id)} />
              ))}
            </div>
          </div>
        )}

        {stats.completed > 0 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Completed</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {populationsByStatus.completed.slice(0, 6).map(pop => (
                <PopulationCard key={pop.id} population={pop} onClick={() => onSelectPopulation?.(pop.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PopulationCard: React.FC<{ population: any; onClick: () => void }> = ({ population, onClick }) => {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    generating: 'bg-blue-100 text-blue-800 animate-pulse',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-medium text-gray-900 truncate">{population.name}</h4>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[population.status.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
          {population.status}
        </span>
      </div>
      <p className="text-sm text-gray-600">{population.patient_count} patients</p>
      {population.status.toLowerCase() === 'generating' && population.progress && (
        <div className="mt-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${population.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">{population.progress}% complete</p>
        </div>
      )}
    </div>
  );
};
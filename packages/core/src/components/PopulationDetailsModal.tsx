import React, { useEffect, useState } from 'react';
import { usePopulation } from '../hooks/usePopulation';

interface PopulationDetailsModalProps {
  populationId: string;
  onClose: () => void;
}

export const PopulationDetailsModal: React.FC<PopulationDetailsModalProps> = ({ populationId, onClose }) => {
  const { population, isLoading } = usePopulation(populationId);
  const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'patients' | 'logs'>('overview');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!population && !isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={onClose}>
      <div 
        className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {population?.name || 'Loading...'}
            </h2>
            {population && (
              <div className="flex items-center gap-3 mt-2">
                <StatusBadge status={population.status} />
                <span className="text-sm text-gray-500">
                  Created {population.created_at ? new Date(population.created_at).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : population ? (
          <>
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                {(['overview', 'config', 'patients', 'logs'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">Total Patients</div>
                      <div className="text-2xl font-bold text-gray-900">{population.patient_count}</div>
                    </div>
                    {population.status === 'generating' && population.progress !== undefined && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600">Progress</div>
                        <div className="text-2xl font-bold text-blue-700">{typeof population.progress === 'number' ? `${population.progress}%` : `${population.progress.percentage}%`}</div>
                      </div>
                    )}
                    {population.completed_at && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600">Duration</div>
                        <div className="text-2xl font-bold text-green-700">
                          {population.created_at ? Math.round((new Date(population.completed_at).getTime() - new Date(population.created_at).getTime()) / 60000) : 0} min
                        </div>
                      </div>
                    )}
                  </div>

                  {population.status === 'generating' && population.progress !== undefined && (
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Generation Progress</span>
                        <span>
                          {typeof population.progress === 'object'
                            ? `${population.progress.current} / ${population.progress.total} patients (${population.progress.percentage}%)`
                            : `${population.progress}%`}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: typeof population.progress === 'number' ? `${population.progress}%` : `${population.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {population.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">Generation Error</h3>
                          <div className="mt-2 text-sm text-red-700">
                            <pre className="whitespace-pre-wrap">{population.error}</pre>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'config' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Generation Configuration</h3>
                  <pre className="text-sm text-gray-700 overflow-x-auto">
                    {JSON.stringify(population.config, null, 2)}
                  </pre>
                </div>
              )}

              {activeTab === 'patients' && (
                <div>
                  {population.status === 'completed' ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800">
                          Patient records have been generated and are available for export.
                          Use the Export tab to download the data in your preferred format.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Format</div>
                          <div className="font-medium">FHIR R4</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Total Size</div>
                          <div className="font-medium">~{Math.round((population.patient_count || 0) * 0.5)} MB</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Records</div>
                          <div className="font-medium">{population.patient_count}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <div className="text-sm text-gray-500">Compressed</div>
                          <div className="font-medium">Available</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      {population.status === 'generating' 
                        ? 'Patient records will be available once generation is complete.'
                        : 'No patient records available.'}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  {population.logs && population.logs.length > 0 ? (
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96 overflow-y-auto">
                      {population.logs.map((log: any, index: number) => (
                        <div key={index} className="mb-1">
                          <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                          <span className={`ml-2 ${
                            log.level === 'error' ? 'text-red-400' :
                            log.level === 'warning' ? 'text-yellow-400' :
                            'text-green-400'
                          }`}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      No logs available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
              {population.status === 'completed' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Export Data
                </button>
              )}
              {population.status === 'generating' && (
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Cancel Generation
                </button>
              )}
              {population.status === 'failed' && (
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Retry Generation
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    generating: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
    }`}>
      {status === 'generating' && (
        <svg className="-ml-0.5 mr-1 h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {status}
    </span>
  );
};
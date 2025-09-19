/**
 * Main App Component
 */

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools/production';
import { Toaster } from 'react-hot-toast';
import PopulationDashboard from './components/PopulationDashboard';
import ServiceHealth from './components/ServiceHealth';
import EHRSimulator from './components/EHRSimulator';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type TabType = 'populations' | 'ehr' | 'health' | 'analytics';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('populations');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold text-gray-900">Synthea Studio</h1>
                <span className="text-sm text-gray-500">
                  Synthetic Patient Generation Platform
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">v1.0.0</span>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setActiveTab('populations')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'populations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Populations
              </button>
              <button
                onClick={() => setActiveTab('ehr')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'ehr'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                EHR Simulator
              </button>
              <button
                onClick={() => setActiveTab('health')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'health'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Service Health
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                  activeTab === 'analytics'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Analytics
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className={activeTab === 'ehr' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
          {activeTab === 'populations' && <PopulationDashboard />}
          {activeTab === 'ehr' && <EHRSimulator />}
          {activeTab === 'health' && <ServiceHealth />}
          {activeTab === 'analytics' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                System Analytics
              </h2>
              <p className="text-gray-500">
                Analytics dashboard coming soon. Select a population to view its analytics.
              </p>
            </div>
          )}
        </main>

        {/* Toast notifications */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10b981',
              },
            },
            error: {
              style: {
                background: '#ef4444',
              },
            },
          }}
        />

        {/* React Query Devtools */}
        <ReactQueryDevtools initialIsOpen={false} />
      </div>
    </QueryClientProvider>
  );
}

export default App;
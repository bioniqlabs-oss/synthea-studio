import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SyntheaProvider } from './contexts/SyntheaContext';
import { PopulationDashboard } from './components/PopulationDashboard';
import { PatientGenerator } from './components/PatientGenerator';
import { PopulationManager } from './components/PopulationManager';
import { PatientList } from './components/PatientList/PatientList';
import { FHIRViewer } from './components/FHIRViewer/FHIRViewer';
import { FHIRTesting } from './components/FHIRTesting/FHIRTesting';
import { ExportPanel } from './components/ExportPanel';
import { ConfigurationPanel } from './components/ConfigurationPanel/ConfigurationPanel';
import './styles/index.css';

export interface SyntheaStudioProps {
  // API Configuration
  apiUrl?: string;
  apiKey?: string;

  // Display Configuration
  mode?: 'full' | 'compact' | 'widget';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
  defaultTab?: 'generate' | 'populations' | 'patients' | 'fhir-viewer' | 'fhir-testing' | 'export' | 'configuration';

  // Feature Flags
  features?: {
    showHeader?: boolean;
    showNavigation?: boolean;
    allowCreate?: boolean;
    allowDelete?: boolean;
    allowExport?: boolean;
    showAdvancedConfig?: boolean;
    enablePatients?: boolean;
    enableFHIR?: boolean;
    enableConfiguration?: boolean;
  };

  // Integration Callbacks
  onPopulationCreated?: (population: any) => void;
  onPatientsGenerated?: (patients: any[]) => void;
  onExportRequested?: (data: any) => void;
  onPatientSelect?: (patient: any) => void;
  onError?: (error: Error) => void;

  // Custom Components
  customHeader?: React.ReactNode;
  customFooter?: React.ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const SyntheaStudio: React.FC<SyntheaStudioProps> = ({
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8001',
  apiKey,
  mode = 'full',
  theme = 'auto',
  className = '',
  defaultTab = 'synthea',
  features = {
    showHeader: true,
    showNavigation: true,
    allowCreate: true,
    allowDelete: true,
    allowExport: true,
    showAdvancedConfig: true,
    enablePatients: true,
    enableFHIR: true,
    enableConfiguration: true,
  },
  onPopulationCreated,
  onPatientsGenerated,
  onExportRequested,
  onPatientSelect,
  onError,
  customHeader,
  customFooter,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const config = {
    apiUrl,
    apiKey,
    mode,
    theme,
    features,
    callbacks: {
      onPopulationCreated,
      onPatientsGenerated,
      onExportRequested,
      onPatientSelect,
      onError,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SyntheaProvider config={config}>
        <div className={`synthea-studio synthea-mode-${mode} ${className}`}>
          <Toaster position="top-right" />

          {customHeader || (features.showHeader && (
            <div className="synthea-header bg-white shadow-sm border-b">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                  <h1 className="text-2xl font-bold text-gray-900">Synthea Studio</h1>
                  <div className="text-sm text-gray-500">Healthcare Data Platform</div>
                </div>
              </div>
            </div>
          ))}

          {features.showNavigation && (
            <div className="border-b bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav className="flex space-x-8" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('synthea')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'synthea'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Synthea Studio
                  </button>
                  {features.enablePatients && (
                    <button
                      onClick={() => setActiveTab('patients')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'patients'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Patients
                    </button>
                  )}
                  {features.enableFHIR && (
                    <>
                      <button
                        onClick={() => setActiveTab('fhir-viewer')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'fhir-viewer'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        FHIR Viewer
                      </button>
                      <button
                        onClick={() => setActiveTab('fhir-testing')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                          activeTab === 'fhir-testing'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        FHIR Testing
                      </button>
                    </>
                  )}
                  {features.enableConfiguration && (
                    <button
                      onClick={() => setActiveTab('configuration')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'configuration'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Configuration
                    </button>
                  )}
                </nav>
              </div>
            </div>
          )}

          <div className="synthea-content max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {activeTab === 'synthea' && <PopulationDashboard />}
            {activeTab === 'patients' && features.enablePatients && <PatientList />}
            {activeTab === 'fhir-viewer' && features.enableFHIR && <FHIRViewer />}
            {activeTab === 'fhir-testing' && features.enableFHIR && <FHIRTesting />}
            {activeTab === 'configuration' && features.enableConfiguration && <ConfigurationPanel apiUrl={apiUrl} mode="embedded" />}
          </div>

          {customFooter}
        </div>
      </SyntheaProvider>
    </QueryClientProvider>
  );
};

// Default export for module federation
export default SyntheaStudio;

// Export individual components for granular use
export { PopulationManager } from './components/PopulationManager';
export { PatientGenerator } from './components/PatientGenerator';
export { ExportPanel } from './components/ExportPanel';
export { PatientList } from './components/PatientList/PatientList';
export { FHIRViewer } from './components/FHIRViewer/FHIRViewer';
export { FHIRTesting } from './components/FHIRTesting/FHIRTesting';
export { ConfigurationPanel } from './components/ConfigurationPanel/ConfigurationPanel';

// Export hooks for programmatic use
export { usePopulations } from './hooks/usePopulations';
export { useGenerator } from './hooks/useGenerator';
export { useExport } from './hooks/useExport';

// Export API functions for direct use
export * as api from './services/api';

// Export types
export * from './types';
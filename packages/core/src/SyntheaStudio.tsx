import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SyntheaProvider } from './contexts/SyntheaContext';
import { PopulationDashboard } from './components/PopulationDashboard';
import './styles/index.css';

export interface SyntheaStudioProps {
  // API Configuration
  apiUrl?: string;
  apiKey?: string;

  // Display Configuration
  mode?: 'full' | 'compact' | 'widget';
  theme?: 'light' | 'dark' | 'auto';
  className?: string;

  // Feature Flags
  features?: {
    showHeader?: boolean;
    showNavigation?: boolean;
    allowCreate?: boolean;
    allowDelete?: boolean;
    allowExport?: boolean;
    showAdvancedConfig?: boolean;
  };

  // Integration Callbacks
  onPopulationCreated?: (population: any) => void;
  onPatientsGenerated?: (patients: any[]) => void;
  onExportRequested?: (data: any) => void;
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
  features = {
    showHeader: true,
    showNavigation: true,
    allowCreate: true,
    allowDelete: true,
    allowExport: true,
    showAdvancedConfig: true,
  },
  onPopulationCreated,
  onPatientsGenerated,
  onExportRequested,
  onError,
  customHeader,
  customFooter,
}) => {
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
      onError,
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <SyntheaProvider config={config}>
        <div className={`synthea-studio synthea-mode-${mode} ${className}`}>
          <Toaster position="top-right" />

          {customHeader || (features.showHeader && (
            <div className="synthea-header">
              <h1 className="text-2xl font-bold">Synthea Studio</h1>
            </div>
          ))}

          <div className="synthea-content">
            <PopulationDashboard />
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

// Export hooks for programmatic use
export { usePopulations } from './hooks/usePopulations';
export { useGenerator } from './hooks/useGenerator';
export { useExport } from './hooks/useExport';

// Export API functions for direct use
export * as api from './services/api';

// Export types
export * from './types';
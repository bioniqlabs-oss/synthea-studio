import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { SyntheaProvider } from './contexts/SyntheaContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import NewPopulation from './pages/NewPopulation';
import PopulationDetail from './pages/PopulationDetail';
import Templates from './pages/Templates';
import './styles/index.css';

export interface SyntheaStudioWithRouterProps {
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

export const SyntheaStudioWithRouter: React.FC<SyntheaStudioWithRouterProps> = ({
  apiUrl = 'http://localhost:8001',
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
        <Router>
          <div className={`synthea-studio synthea-mode-${mode} ${className}`}>
            <Toaster position="top-right" />

            {customHeader || (
              <Layout apiUrl={apiUrl}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/new" element={<NewPopulation />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/population/:id" element={<PopulationDetail />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            )}

            {customFooter}
          </div>
        </Router>
      </SyntheaProvider>
    </QueryClientProvider>
  );
};

export default SyntheaStudioWithRouter;
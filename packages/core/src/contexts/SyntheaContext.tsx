import React, { createContext, useContext, ReactNode } from 'react';

interface SyntheaConfig {
  apiUrl: string;
  apiKey?: string;
  mode: 'full' | 'compact' | 'widget';
  theme: 'light' | 'dark' | 'auto';
  features: {
    showHeader?: boolean;
    showNavigation?: boolean;
    allowCreate?: boolean;
    allowDelete?: boolean;
    allowExport?: boolean;
    showAdvancedConfig?: boolean;
  };
  callbacks: {
    onPopulationCreated?: (population: any) => void;
    onPatientsGenerated?: (patients: any[]) => void;
    onExportRequested?: (data: any) => void;
    onError?: (error: Error) => void;
  };
}

const SyntheaContext = createContext<{ config: SyntheaConfig } | undefined>(undefined);

export const SyntheaProvider: React.FC<{ config: SyntheaConfig; children: ReactNode }> = ({
  config,
  children,
}) => {
  return <SyntheaContext.Provider value={{ config }}>{children}</SyntheaContext.Provider>;
};

export const useSyntheaConfig = () => {
  const context = useContext(SyntheaContext);
  if (!context) {
    throw new Error('useSyntheaConfig must be used within SyntheaProvider');
  }
  return context.config;
};
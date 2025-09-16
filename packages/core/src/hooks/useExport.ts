import { useState } from 'react';
import { useSyntheaConfig } from '../contexts/SyntheaContext';
import * as api from '../services/api';

export const useExport = () => {
  const config = useSyntheaConfig();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const exportPopulation = async (
    populationId: string,
    format: 'fhir' | 'csv' | 'ccda' | 'ndjson'
  ) => {
    setIsExporting(true);
    setError(null);

    try {
      const url = await api.exportPopulation(config.apiUrl, populationId, format);

      // Open the download URL in a new tab
      window.open(url, '_blank');

      config.callbacks.onExportRequested?.({
        populationId,
        format,
        url,
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      config.callbacks.onError?.(error);
    } finally {
      setIsExporting(false);
    }
  };

  return {
    exportPopulation,
    isExporting,
    error,
  };
};
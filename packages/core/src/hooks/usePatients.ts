import { useState, useEffect } from 'react';
import { useSyntheaConfig } from '../contexts/SyntheaContext';

interface UsePatientParams {
  apiUrl?: string;
  mode?: 'standalone' | 'embedded';
  pageSize?: number;
  offset?: number;
}

interface Patient {
  id: string;
  resourceType: 'Patient';
  name?: Array<{ family?: string; given?: string[] }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{ city?: string; state?: string }>;
}

export const usePatients = ({
  apiUrl: customApiUrl,
  mode = 'standalone',
  pageSize = 20,
  offset = 0
}: UsePatientParams = {}) => {
  const config = useSyntheaConfig();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const apiUrl = customApiUrl || config.apiUrl;
  const fhirEndpoint = mode === 'embedded' ? `${apiUrl}/fhir` : `${apiUrl}/fhir`;

  const fetchPatients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        _count: pageSize.toString(),
        _offset: offset.toString(),
      });

      const response = await fetch(`${fhirEndpoint}/Patient?${params}`, {
        headers: config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {},
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch patients: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.resourceType === 'Bundle' && data.entry) {
        setPatients(data.entry.map((e: any) => e.resource));
        setTotal(data.total || 0);
      } else {
        setPatients([]);
        setTotal(0);
      }
    } catch (err) {
      setError(err as Error);
      config.callbacks.onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [pageSize, offset]);

  return {
    patients,
    total,
    isLoading,
    error,
    refetch: fetchPatients,
  };
};
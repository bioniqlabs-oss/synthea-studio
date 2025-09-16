import axios from 'axios';

export interface Population {
  id: string;
  name: string;
  description?: string;
  patient_count: number;
  status: string;
  config: any;
  created_at: string;
  completed_at?: string;
}

export async function getPopulations(apiUrl: string): Promise<Population[]> {
  const response = await axios.get(`${apiUrl}/api/populations/`);
  return response.data;
}

export async function getPopulation(apiUrl: string, id: string): Promise<Population> {
  const response = await axios.get(`${apiUrl}/api/populations/${id}`);
  return response.data;
}

export async function createPopulation(
  apiUrl: string,
  data: {
    name: string;
    description?: string;
    size: number;
    config: any;
  }
): Promise<Population> {
  const response = await axios.post(`${apiUrl}/api/populations/`, data);
  return response.data;
}

export async function deletePopulation(apiUrl: string, id: string): Promise<void> {
  await axios.delete(`${apiUrl}/api/populations/${id}`);
}

export async function exportPopulation(
  apiUrl: string,
  id: string,
  format: 'fhir' | 'csv' | 'ccda' | 'ndjson'
): Promise<string> {
  // Return the download URL
  return `${apiUrl}/api/export/${id}?format=${format}`;
}

export async function getGenerationJobs(apiUrl: string, populationId?: string) {
  const params = populationId ? { population_id: populationId } : {};
  const response = await axios.get(`${apiUrl}/api/generation/jobs`, { params });
  return response.data;
}

export async function getGenerationProgress(apiUrl: string, jobId: string) {
  const response = await axios.get(`${apiUrl}/api/generation/progress/${jobId}`);
  return response.data;
}

export async function startGeneration(apiUrl: string, id: string): Promise<{
  message: string;
  population_id: string;
  job_id: string;
}> {
  const response = await axios.post(`${apiUrl}/api/generation/${id}/start`);
  return response.data;
}

export async function stopGeneration(apiUrl: string, id: string): Promise<{ message: string }> {
  const response = await axios.post(`${apiUrl}/api/generation/${id}/stop`);
  return response.data;
}

// WebSocket connection for progress updates
export class ProgressWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  connect(wsUrl: string, populationId: string, callbacks: {
    onProgress?: (data: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
  }) {
    const fullUrl = `${wsUrl}/api/generation/ws/${populationId}`;

    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = () => {
      console.log(`WebSocket connected for population ${populationId}`);
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error && callbacks.onError) {
          callbacks.onError(data.error);
        } else if (data.progress !== undefined && callbacks.onProgress) {
          callbacks.onProgress(data);

          if (data.progress === 100 && callbacks.onComplete) {
            callbacks.onComplete();
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (callbacks.onError) {
        callbacks.onError('WebSocket connection error');
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Auto-reconnect after 3 seconds
      this.reconnectTimeout = setTimeout(() => {
        this.connect(wsUrl, populationId, callbacks);
      }, 3000);
    };
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth (if needed later)
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

// Types
export interface Population {
  id: string;
  name: string;
  description?: string;
  patient_count: number;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  config: PopulationConfig;
  created_at: string;
  completed_at?: string;
}

export interface PopulationConfig {
  modules?: string[];
  age_range?: [number, number];
  gender?: string;
  gender_distribution?: Record<string, number>;
  state?: string;
  city?: string;
  export_fhir?: boolean;
  export_csv?: boolean;
  export_ccda?: boolean;
  [key: string]: any;
}

export interface PopulationCreate {
  name: string;
  description?: string;
  size: number;
  config: PopulationConfig;
}

export interface GenerationJob {
  id: string;
  population_id: string;
  progress: number;
  message?: string;
  error?: string;
}

// API endpoints
export const populationApi = {
  // List all populations
  list: async (params?: { 
    skip?: number; 
    limit?: number; 
    status?: string 
  }): Promise<Population[]> => {
    const response = await apiClient.get('/api/populations/', { params });
    return response.data;
  },

  // Get single population
  get: async (id: string): Promise<Population> => {
    const response = await apiClient.get(`/api/populations/${id}`);
    return response.data;
  },

  // Create new population
  create: async (data: PopulationCreate): Promise<Population> => {
    const response = await apiClient.post('/api/populations', data);
    return response.data;
  },

  // Delete population
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/populations/${id}`);
  },

  // Start generation
  startGeneration: async (id: string): Promise<{ 
    message: string; 
    population_id: string; 
    job_id: string;
  }> => {
    const response = await apiClient.post(`/api/generation/${id}/start`);
    return response.data;
  },

  // Stop generation
  stopGeneration: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/generation/${id}/stop`);
    return response.data;
  },

  // Export population
  export: async (id: string, format: 'fhir' | 'csv' | 'ndjson' | 'ccda' = 'fhir'): Promise<{
    message: string;
    download_url: string;
  }> => {
    // The export endpoint returns a file directly, not JSON
    // So we'll open it directly in a new window
    const url = `${API_BASE_URL}/api/export/${id}?format=${format}`;
    window.open(url, '_blank');
    return {
      message: 'Download started',
      download_url: url
    };
  },
};

// WebSocket connection for progress updates
export class ProgressWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  
  connect(populationId: string, callbacks: {
    onProgress?: (data: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
  }) {
    const wsUrl = `${WS_BASE_URL}/api/generation/ws/${populationId}`;
    
    this.ws = new WebSocket(wsUrl);
    
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
        this.connect(populationId, callbacks);
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

// Template loader
export const templateApi = {
  list: async (): Promise<any[]> => {
    // For now, return static templates
    // Later this could fetch from backend
    return [
      {
        id: 'diabetes-study',
        name: 'Diabetes Study Population',
        description: 'Population focused on Type 2 diabetes patients',
        size: 100
      },
      {
        id: 'pediatric-asthma',
        name: 'Pediatric Asthma Cohort',
        description: 'Children with asthma and allergic conditions',
        size: 50
      },
      {
        id: 'general-population',
        name: 'General Population',
        description: 'Diverse general population baseline',
        size: 200
      },
      {
        id: 'cardiovascular-risk',
        name: 'Cardiovascular Risk',
        description: 'High risk for cardiovascular events',
        size: 75
      }
    ];
  },
  
  load: async (id: string): Promise<PopulationCreate> => {
    // Load template configuration
    const templates: Record<string, PopulationCreate> = {
      'diabetes-study': {
        name: 'Diabetes Study Population',
        description: 'Population focused on Type 2 diabetes patients with common comorbidities',
        size: 100,
        config: {
          modules: ['diabetes', 'hypertension', 'metabolic_syndrome'],
          age_range: [40, 75],
          gender_distribution: { M: 0.52, F: 0.48 },
          export_fhir: true,
          export_csv: true,
        }
      },
      'pediatric-asthma': {
        name: 'Pediatric Asthma Cohort',
        description: 'Children with asthma and allergic conditions',
        size: 50,
        config: {
          modules: ['asthma', 'allergies', 'childhood_obesity'],
          age_range: [5, 17],
          gender_distribution: { M: 0.55, F: 0.45 },
          export_fhir: true,
        }
      },
      'general-population': {
        name: 'General Population Baseline',
        description: 'Diverse general population with typical disease distribution',
        size: 200,
        config: {
          modules: [],
          age_range: [0, 90],
          gender_distribution: { M: 0.49, F: 0.51 },
          export_fhir: true,
          export_csv: true,
        }
      },
      'cardiovascular-risk': {
        name: 'Cardiovascular Risk Assessment',
        description: 'Population at high risk for cardiovascular events',
        size: 75,
        config: {
          modules: ['heart_disease', 'hypertension', 'hyperlipidemia'],
          age_range: [45, 80],
          gender_distribution: { M: 0.58, F: 0.42 },
          export_fhir: true,
          export_csv: true,
        }
      }
    };
    
    return templates[id] || templates['general-population'];
  }
};

export default apiClient;
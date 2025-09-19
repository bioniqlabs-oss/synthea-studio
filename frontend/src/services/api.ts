/**
 * API Service - Centralized API client using the Gateway
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'react-hot-toast';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_TIMEOUT = 30000;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string; detail: string }>) => {
    // Handle different error types
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.detail || error.response.data?.error;

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
          break;
        case 429:
          // Rate limited
          toast.error('Too many requests. Please slow down.');
          break;
        case 503:
          // Service unavailable
          toast.error('Service temporarily unavailable. Please try again later.');
          break;
        default:
          toast.error(message || `Error: ${status}`);
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    }

    return Promise.reject(error);
  }
);

// Population API
export const populationApi = {
  // List populations
  list: async (params?: { limit?: number; offset?: number; status?: string }) => {
    const response = await apiClient.get('/api/populations', { params });
    // Backend returns array directly, wrap it for consistency
    const data = response.data;
    return { populations: Array.isArray(data) ? data : data.populations || [] };
  },

  // Get single population
  get: async (id: string) => {
    const response = await apiClient.get(`/api/populations/${id}`);
    return response.data;
  },

  // Create population
  create: async (data: {
    name: string;
    size: number;
    config: Record<string, any>;
  }) => {
    const response = await apiClient.post('/api/populations', data);
    return response.data;
  },

  // Delete population
  delete: async (id: string) => {
    const response = await apiClient.delete(`/api/populations/${id}`);
    return response.data;
  },

  // Get status
  getStatus: async (id: string) => {
    const response = await apiClient.get(`/api/populations/${id}/status`);
    return response.data;
  },

  // Get statistics
  getStatistics: async (id: string) => {
    const response = await apiClient.get(`/api/populations/${id}/statistics`);
    return response.data;
  },

  // Manual import
  import: async (id: string, outputPath: string) => {
    const response = await apiClient.post(`/api/populations/${id}/import`, {
      population_id: id,
      output_path: outputPath,
    });
    return response.data;
  },

  // Export population data
  export: async (id: string, format: 'fhir' | 'csv' | 'ccda' | 'ndjson' = 'fhir') => {
    const response = await apiClient.get(`/api/export/${id}`, {
      params: { format },
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${id}_${format}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true };
  },
};

// FHIR API
export const fhirApi = {
  // Search resources
  search: async (
    resourceType: string,
    params?: {
      population_id?: string;
      patient?: string;
      _count?: number;
      _offset?: number;
    }
  ) => {
    const response = await apiClient.get(`/fhir/${resourceType}`, { params });
    return response.data;
  },

  // Get resource
  get: async (resourceType: string, id: string) => {
    const response = await apiClient.get(`/fhir/${resourceType}/${id}`);
    return response.data;
  },

  // Create resource
  create: async (resourceType: string, resource: any) => {
    const response = await apiClient.post(`/fhir/${resourceType}`, resource);
    return response.data;
  },

  // Update resource
  update: async (resourceType: string, id: string, resource: any) => {
    const response = await apiClient.put(`/fhir/${resourceType}/${id}`, resource);
    return response.data;
  },

  // Delete resource
  delete: async (resourceType: string, id: string) => {
    const response = await apiClient.delete(`/fhir/${resourceType}/${id}`);
    return response.data;
  },

  // Global search
  globalSearch: async (query: string, resourceTypes?: string[], limit?: number) => {
    const params = {
      query,
      resource_types: resourceTypes,
      limit,
    };
    const response = await apiClient.get('/fhir/_search', { params });
    return response.data;
  },

  // Create bundle
  createBundle: async (bundle: any) => {
    const response = await apiClient.post('/fhir', bundle);
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  // Overview
  getOverview: async () => {
    const response = await apiClient.get('/api/analytics/overview');
    return response.data;
  },

  // Population analytics
  getPopulationAnalytics: async (populationId: string) => {
    const response = await apiClient.get(`/api/analytics/populations/${populationId}`);
    return response.data;
  },

  // Condition analytics
  getConditionAnalytics: async (populationId?: string, topN?: number) => {
    const params = { population_id: populationId, top_n: topN };
    const response = await apiClient.get('/api/analytics/conditions', { params });
    return response.data;
  },

  // Demographics
  getDemographics: async (populationId?: string) => {
    const params = { population_id: populationId };
    const response = await apiClient.get('/api/analytics/demographics', { params });
    return response.data;
  },

  // Utilization
  getUtilization: async (params?: {
    population_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await apiClient.get('/api/analytics/utilization', { params });
    return response.data;
  },

  // Trends
  getTrends: async (metric: string, period?: string, days?: number) => {
    const params = { metric, period, days };
    const response = await apiClient.get('/api/analytics/trends', { params });
    return response.data;
  },

  // Export
  export: async (populationId?: string, format?: 'json' | 'csv' | 'excel') => {
    const params = { population_id: populationId, format };
    const response = await apiClient.get('/api/analytics/export', {
      params,
      responseType: format === 'json' ? 'json' : 'blob',
    });
    return response.data;
  },
};

// Health API
export const healthApi = {
  // Get health status
  getHealth: async () => {
    const response = await apiClient.get('/health/');
    return response.data;
  },

  // Get service status
  getServices: async () => {
    const response = await apiClient.get('/health/services');
    return response.data;
  },

  // Get readiness
  getReadiness: async () => {
    const response = await apiClient.get('/health/ready');
    return response.data;
  },

  // Get metrics
  getMetrics: async () => {
    const response = await apiClient.get('/health/metrics');
    return response.data;
  },
};

export default apiClient;
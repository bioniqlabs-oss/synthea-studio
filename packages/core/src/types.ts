// Synthea Studio Types

export interface Population {
  id: string;
  name: string;
  description?: string;
  size: number;
  configuration: PopulationConfig;
  createdAt: string;
  updatedAt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
}

export interface PopulationConfig {
  seed?: number;
  gender?: {
    male: number;
    female: number;
  };
  ageRange?: {
    min: number;
    max: number;
  };
  modules?: string[];
  exportFormats?: ExportFormat[];
}

export type ExportFormat = 'fhir' | 'csv' | 'json' | 'ccda';

export interface Patient {
  id: string;
  populationId: string;
  resourceType: string;
  data: any;
  createdAt: string;
}

export interface GenerationJob {
  id: string;
  populationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ExportRequest {
  populationId: string;
  format: ExportFormat;
  filters?: {
    patientIds?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}
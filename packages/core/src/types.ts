// Synthea Studio Types

export interface Population {
  id: string;
  name: string;
  description?: string;
  size?: number;
  patient_count?: number;
  configuration?: PopulationConfig;
  config?: any;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  completed_at?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress?: {
    current: number;
    total: number;
    percentage: number;
  } | number;
  error?: string;
  logs?: string[];
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

// FHIR Resource Types
export interface Patient {
  id: string;
  resourceType: 'Patient';
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
  identifier?: Array<{
    system?: string;
    value: string;
  }>;
  active?: boolean;
  name?: Array<{
    use?: string;
    family?: string;
    given?: string[];
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
  address?: Array<{
    use?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;
}

export interface Condition {
  id: string;
  resourceType: 'Condition';
  clinicalStatus?: {
    coding?: Array<{
      system?: string;
      code?: string;
    }>;
  };
  code?: {
    coding?: Array<{
      system?: string;
      code?: string;
      display?: string;
    }>;
    text?: string;
  };
  subject: {
    reference: string;
  };
  onsetDateTime?: string;
}

export interface Observation {
  id: string;
  resourceType: 'Observation';
  status: 'final' | 'preliminary' | 'registered';
  code: {
    text?: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime?: string;
  valueQuantity?: {
    value?: number;
    unit?: string;
  };
}

export interface Bundle {
  resourceType: 'Bundle';
  type: string;
  total?: number;
  entry?: Array<{
    resource: Patient | Condition | Observation;
  }>;
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
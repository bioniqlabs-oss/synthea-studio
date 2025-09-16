export interface Population {
  id: string;
  name: string;
  description?: string;
  patient_count: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  config: PopulationConfig;
  created_at: string;
  completed_at?: string;
}

export interface PopulationConfig {
  state?: string;
  city?: string;
  age_range?: [number, number];
  gender?: 'M' | 'F' | 'all';
  modules?: string[];
  population_seed?: number;
  clinician_seed?: number;
  reference_date?: string;
  time_step?: number;
}

export interface GenerationJob {
  id: string;
  population_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  total: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface Patient {
  id: string;
  population_id: string;
  demographics: PatientDemographics;
  conditions: Condition[];
  medications: Medication[];
  observations: Observation[];
}

export interface PatientDemographics {
  first_name: string;
  last_name: string;
  gender: 'M' | 'F';
  birth_date: string;
  race: string;
  ethnicity: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export interface Condition {
  code: string;
  display: string;
  onset_date: string;
  abatement_date?: string;
  status: 'active' | 'resolved';
}

export interface Medication {
  code: string;
  display: string;
  start_date: string;
  end_date?: string;
  dosage: string;
}

export interface Observation {
  code: string;
  display: string;
  value: any;
  unit?: string;
  date: string;
}
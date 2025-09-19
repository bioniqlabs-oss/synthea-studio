-- Initialize database for Synthea Studio

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create GIN index operators for JSONB
CREATE INDEX IF NOT EXISTS idx_fhir_resources_gin ON fhir_resources USING gin(resource);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_type ON fhir_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_fhir_resources_population ON fhir_resources(population_id);

-- Create indexes for populations
CREATE INDEX IF NOT EXISTS idx_populations_status ON populations(status);
CREATE INDEX IF NOT EXISTS idx_populations_created ON populations(created_at);

-- Create indexes for generation jobs
CREATE INDEX IF NOT EXISTS idx_generation_jobs_population ON generation_jobs(population_id);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status ON generation_jobs(status);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE synthea_studio TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
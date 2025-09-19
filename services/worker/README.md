# Synthea Studio Worker Service

Background task processing service for Synthea Studio, handling population generation, FHIR imports, and cleanup tasks.

## Features

- **Population Generation**: Asynchronous generation of synthetic patient populations using Synthea
- **FHIR Import**: Direct database import of generated FHIR resources
- **Cleanup Tasks**: Automated cleanup of old populations and orphaned data
- **Progress Tracking**: Real-time progress updates via Redis pub/sub

## Architecture

The worker service uses:
- **Celery** for distributed task processing
- **Redis** for task queue and pub/sub messaging
- **PostgreSQL** for persistent storage
- **Synthea** Java application for synthetic data generation

## Tasks

### Generation Tasks
- `generate_population`: Generate a new synthetic population
- Progress updates published to Redis channel `population:{id}:progress`

### Import Tasks
- `import_population_to_fhir`: Import generated FHIR bundles to database
- `reimport_population`: Re-import existing population data
- `get_import_stats`: Get import statistics for a population

### Cleanup Tasks
- `cleanup_old_populations`: Remove populations older than threshold
- `cleanup_failed_populations`: Clean up failed generation attempts
- `cleanup_orphaned_resources`: Remove resources without populations

## Configuration

Environment variables:
```bash
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1
SYNTHEA_JAR_PATH=/opt/synthea/synthea.jar
STORAGE_PATH=/data/synthea
WORKER_CONCURRENCY=4
```

## Development

### Running locally
```bash
# Install dependencies
pip install -r requirements.txt

# Run worker
celery -A app.celery_app worker --loglevel=info
```

### Running with Docker
```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f worker
```

### Running tests
```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html
```

## API Integration

The worker service integrates with other services via:
- **Shared models** from the shared package
- **Direct database access** for FHIR resource storage
- **Redis pub/sub** for real-time updates

## Monitoring

Monitor worker health:
```bash
# Check worker status
celery -A app.celery_app inspect active

# View task statistics
celery -A app.celery_app inspect stats
```
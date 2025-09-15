# Synthea Studio Backend

FastAPI-based backend service for Synthea Studio population management.

## Technology Stack

- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **PostgreSQL** - Database
- **Redis** - Cache and message broker
- **Celery** - Async task processing
- **Alembic** - Database migrations
- **Pydantic** - Data validation

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   FastAPI   │────▶│   Celery    │────▶│   Synthea   │
│   (API)     │     │   (Worker)  │     │   (Java)    │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       └───────┬───────────┘
               ▼
        ┌─────────────┐
        │  PostgreSQL │
        │   + Redis   │
        └─────────────┘
```

## Development

### Prerequisites

- Python 3.9+
- PostgreSQL 14+
- Redis 7+
- Java 11+ (for Synthea)

### Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Run database migrations
alembic upgrade head

# Start the API server
uvicorn app.main:app --reload --port 8001

# Start Celery worker (in another terminal)
celery -A app.workers.generation_worker worker --loglevel=info
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synthea_studio
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
STORAGE_BACKEND=local
STORAGE_PATH=/var/lib/synthea-studio/storage
SYNTHEA_JAR_PATH=/app/synthea/synthea-with-dependencies.jar
SYNTHEA_OUTPUT_PATH=/tmp/synthea-output
```

## Project Structure

```
app/
├── api/              # API endpoints
├── core/             # Core configuration
├── models/           # Database models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
├── workers/          # Celery tasks
└── main.py          # Application entry point

alembic/             # Database migrations
tests/               # Test files
```

## API Documentation

When running locally, API documentation is available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

## Key Components

### Population Management
- CRUD operations for populations
- Configuration validation
- Status tracking

### Generation Service
- Synthea wrapper for patient generation
- Async processing with Celery
- Progress tracking with Redis pub/sub

### Storage Service
- Pluggable storage backends
- Support for local, S3, MinIO, Azure
- File management and cleanup

## Database Schema

```sql
-- Populations table
CREATE TABLE populations (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    patient_count INTEGER DEFAULT 0,
    config JSON NOT NULL,
    status VARCHAR,
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    storage_path VARCHAR
);

-- Generation jobs table
CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY,
    population_id VARCHAR REFERENCES populations(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    progress INTEGER DEFAULT 0,
    logs TEXT,
    error_message TEXT,
    celery_task_id VARCHAR
);
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_populations.py

# Run integration tests
pytest tests/integration/
```

## Celery Tasks

### Generation Worker
```python
@celery_app.task
def generate_population(population_id: str, size: int, config: dict):
    """Generate synthetic population using Synthea"""
    # Task implementation
```

### Cleanup Worker
```python
@celery_app.task
def cleanup_old_populations():
    """Remove populations older than retention period"""
    # Task implementation
```

## Docker

```bash
# Build Docker image
docker build -t synthea-studio-backend .

# Run container
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://postgres:postgres@db:5432/synthea_studio \
  -e REDIS_URL=redis://redis:6379 \
  synthea-studio-backend
```

## Performance Considerations

- Use connection pooling for database
- Implement caching for frequently accessed data
- Batch operations for large populations
- Stream large file exports

## Security

- Input validation with Pydantic
- SQL injection prevention with SQLAlchemy
- Rate limiting on API endpoints
- Authentication/authorization (coming soon)

## Contributing

See the main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

Apache License 2.0
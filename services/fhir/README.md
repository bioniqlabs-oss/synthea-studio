# FHIR Service

Standalone FHIR R4 server for Synthea Studio with PostgreSQL backing.

## Features

- ✅ FHIR R4 compliant API
- ✅ PostgreSQL storage with JSONB for efficient querying
- ✅ Bundle transaction support for bulk imports
- ✅ Patient $everything operation
- ✅ Resource search with filters
- ✅ Async/await for high performance
- ✅ Shared models with other services

## Endpoints

### Core Operations
- `GET /health` - Health check
- `GET /metadata` - Capability statement
- `POST /` - Process Bundle transactions

### Patient Resource
- `GET /Patient` - Search patients
- `GET /Patient/{id}` - Get patient
- `POST /Patient` - Create patient
- `PUT /Patient/{id}` - Update patient
- `DELETE /Patient/{id}` - Delete patient
- `GET /Patient/{id}/$everything` - Get all patient resources

### Other Resources
- `/Condition` - Medical conditions
- `/Observation` - Clinical observations
- `/Procedure` - Medical procedures
- `/MedicationRequest` - Prescriptions
- `/Encounter` - Clinical encounters

## Development

### Setup
```bash
cd services/fhir
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables
```bash
cp .env.example .env
# Edit .env with your settings
```

### Run Locally
```bash
uvicorn app.main:app --reload --port 8001
```

### Run Tests
```bash
pytest tests/
```

## Docker

### Build
```bash
docker build -t synthea-fhir-service .
```

### Run
```bash
docker run -p 8001:8001 \
  -e DATABASE_URL=postgresql://user:pass@host/db \
  -e REDIS_URL=redis://redis:6379 \
  synthea-fhir-service
```

## API Examples

### Create Patient
```bash
curl -X POST http://localhost:8001/Patient \
  -H "Content-Type: application/json" \
  -d '{
    "resourceType": "Patient",
    "name": [{"family": "Smith", "given": ["John"]}],
    "gender": "male",
    "birthDate": "1990-01-01"
  }'
```

### Import Bundle from Synthea
```bash
curl -X POST http://localhost:8001/ \
  -H "Content-Type: application/json" \
  -d @synthea-bundle.json
```

### Search Patients
```bash
# By name
curl http://localhost:8001/Patient?name=Smith

# By gender
curl http://localhost:8001/Patient?gender=female

# With pagination
curl http://localhost:8001/Patient?_count=10&_offset=20
```

### Get Patient Everything
```bash
curl http://localhost:8001/Patient/123/$everything
```

## Performance

- JSONB storage with GIN indexes for fast queries
- Connection pooling for database efficiency
- Async operations for concurrent requests
- Redis caching for frequently accessed resources
- Bulk import via Bundle transactions

## Integration

This service integrates with:
- **Synthea Service**: Receives population IDs for tracking
- **Worker Service**: Direct database writes for imports
- **Gateway**: Routes /fhir/* requests here

## Architecture Benefits

### Before (Monolithic)
- In-memory storage limited to ~10 patients
- Lost data on restart
- No proper indexing
- HTTP calls between services

### After (Service)
- PostgreSQL storage handles millions of records
- Persistent storage
- JSONB indexes for fast searches
- Direct database access from workers
- Independent scaling
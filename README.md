# Synthea Studio

Web Interface for [Synthea™](https://github.com/synthetichealth/synthea) with Integrated EHR Simulation

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Powered by Synthea](https://img.shields.io/badge/Powered%20by-Synthea™-blue)](https://synthetichealth.github.io/synthea/)

## Overview

Synthea Studio provides a modern web interface for [Synthea™ Patient Generator](https://github.com/synthetichealth/synthea) with integrated EHR simulation capabilities. It enables healthcare researchers, developers, and educators to generate realistic synthetic patient populations and test them in a simulated EHR environment.

### Key Features

- **🎨 Visual Population Builder** - Configure demographics, conditions, disease prevalence through an intuitive UI
- **🏥 Integrated EHR Simulator** - Browse patients, query FHIR resources, test clinical workflows
- **📊 Clinical Trial Configuration** - Set disease prevalence rates, generate only alive patients, configure social determinants
- **⚡ Real-time Progress Tracking** - Monitor generation with WebSocket updates and progress bars
- **🔍 Advanced FHIR Queries** - Built-in FHIR command tester with query presets and history
- **💾 PostgreSQL FHIR Storage** - Efficient JSONB storage for FHIR resources with population tagging
- **🚀 Async Processing** - Non-blocking generation using Celery workers
- **📦 Multiple Export Formats** - FHIR R4, CSV, C-CDA, NDJSON

### About Synthea™

[Synthea™](https://synthetichealth.github.io/synthea/) is a synthetic patient generator developed by [The MITRE Corporation](https://www.mitre.org/) that models the medical history of synthetic patients. The resulting data is free from cost, privacy, and security restrictions.

**Learn more about Synthea:**
- [Official Documentation](https://synthetichealth.github.io/synthea/)
- [GitHub Repository](https://github.com/synthetichealth/synthea)
- [Wiki & Tutorials](https://github.com/synthetichealth/synthea/wiki)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- 8GB+ RAM recommended
- 20GB+ free disk space for populations

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/bioniqlabs-oss/synthea-studio.git
cd synthea-studio

# Download Synthea JAR (required, not included in repo)
cd backend
./setup_synthea.sh
cd ..

# Start all services
docker-compose up -d

# Visit http://localhost:3000
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- FHIR Endpoint: http://localhost:8001/fhir

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  React Frontend │────▶│  FastAPI     │────▶│   Synthea    │
│  (Port 3000)    │     │  (Port 8001) │     │   (Java JAR) │
└─────────────────┘     └──────────────┘     └──────────────┘
         │                      │
         │               ┌──────┴──────┐
         └──────────────▶│  PostgreSQL │
         WebSocket       │  with JSONB │
                        └─────────────┘
                               │
                        ┌──────┴──────┐
                        │    Redis    │
                        │   (Celery)  │
                        └─────────────┘
```

### Technology Stack

**Frontend:**
- React with TypeScript
- Vite build system
- TailwindCSS for styling
- React Query for data fetching
- WebSocket for real-time updates

**Backend:**
- FastAPI (Python 3.9+)
- SQLAlchemy with async support
- Celery for background tasks
- Redis for pub/sub and caching
- PostgreSQL 15 with JSONB

## Features in Detail

### Population Generation

Create populations with advanced configurations:

```json
{
  "name": "Diabetes Clinical Trial",
  "size": 100,
  "config": {
    "state": "Massachusetts",
    "city": "Boston",
    "age_range": [30, 80],
    "only_alive": true,
    "prevalence": {
      "diabetes": 0.3,
      "hypertension": 0.4,
      "cardiovascular": 0.2
    },
    "modules": ["diabetes", "cardiovascular_disease"],
    "enable_social_determinants": true,
    "enable_us_core": true
  }
}
```

### EHR Simulator Features

- **Patient Browser**: View all generated patients with demographics
- **FHIR Resource Viewer**: Browse Conditions, Observations, Medications, etc.
- **FHIR Query Tester**: Execute custom FHIR queries with presets:
  - Search by condition code: `/Patient?_has:Condition:patient:code=44054006`
  - Date range queries: `/Patient?birthdate=ge1944&birthdate=le2006`
  - Include related resources: `/Patient?_include=Patient:organization`

### Data Management

- **Population Tagging**: All FHIR resources tagged with population ID
- **Cascade Deletion**: Removing a population removes all associated data
- **Manual Import**: Fallback option when auto-import fails
- **Export Options**: FHIR bundles, NDJSON, CSV formats

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/synthea_studio

# Redis
REDIS_URL=redis://localhost:6379

# Storage
STORAGE_PATH=/storage
SYNTHEA_OUTPUT_PATH=/tmp/synthea-output

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:3000,http://localhost:8001

# Synthea
SYNTHEA_JAR_PATH=/app/synthea/synthea-with-dependencies.jar
SYNTHEA_DEFAULT_STATE=Massachusetts
```

### Docker Compose Configuration

The `docker-compose.yml` includes:
- PostgreSQL with persistent volume
- Redis for Celery broker
- Backend API with hot reload
- Frontend with Vite dev server
- Celery worker for async tasks

## API Examples

### Create a Population

```bash
curl -X POST http://localhost:8001/api/populations/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Diabetes Study",
    "size": 50,
    "config": {
      "state": "Massachusetts",
      "city": "Boston",
      "modules": ["diabetes"],
      "prevalence": {
        "diabetes": 0.3
      }
    }
  }'
```

### Query FHIR Resources

```bash
# Get all patients with diabetes
curl "http://localhost:8001/fhir/Patient?_has:Condition:patient:code=44054006"

# Get specific patient
curl "http://localhost:8001/fhir/Patient/123456"

# Search conditions by population
curl "http://localhost:8001/fhir/Condition?population_id=pop_20250919_001"
```

### Manual Import

```bash
# Trigger manual import for a population
curl -X POST "http://localhost:8001/api/populations/pop_20250919_001/import"
```

## Development

### Project Structure

```
synthea-studio/
├── frontend/           # React TypeScript application
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API clients
│   │   └── App.tsx      # Main application
│   └── package.json
├── backend/            # FastAPI backend
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # SQLAlchemy models
│   │   ├── services/    # Business logic
│   │   └── workers/     # Celery tasks
│   └── requirements.txt
├── storage/            # Generated populations (git-ignored)
│   ├── populations/    # Population metadata
│   └── exports/        # Export artifacts
└── docker-compose.yml  # Container orchestration
```

### Running Locally for Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Frontend
cd frontend
npm install
npm run dev

# Database
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine

# Redis
docker run -d -p 6379:6379 redis:7-alpine

# Celery Worker
cd backend
celery -A app.workers.celery_app worker --loglevel=info
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test

# E2E tests
npm run test:e2e
```

## Troubleshooting

### Common Issues

1. **Synthea JAR not found**
   - Run `./setup_synthea.sh` in the backend directory
   - Or download manually from [Synthea releases](https://github.com/synthetichealth/synthea/releases)

2. **Port conflicts**
   - Frontend: Change port in `frontend/vite.config.ts`
   - Backend: Update `VITE_API_URL` in frontend `.env`

3. **Memory issues**
   - Increase Docker memory allocation
   - Reduce population size
   - Clear old populations regularly

4. **Import failures**
   - Use "Manual Import" button in UI
   - Check Celery logs: `docker logs synthea-celery`

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch from `develop`
3. Make your changes with tests
4. Submit a pull request

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

This project builds upon the excellent work of:

- **[Synthea™ Patient Generator](https://github.com/synthetichealth/synthea)** - The core synthetic patient generation engine
- **[The MITRE Corporation](https://www.mitre.org/)** - Original creators and maintainers of Synthea

### Synthea License
Synthea™ is a Trademark of The MITRE Corporation. Synthea is licensed under the Apache License, Version 2.0. This project (Synthea Studio) is an independent UI layer and is not affiliated with or endorsed by The MITRE Corporation.

## Support

- [Issue Tracker](https://github.com/bioniqlabs-oss/synthea-studio/issues)
- [Discussions](https://github.com/bioniqlabs-oss/synthea-studio/discussions)

---

**Note**: This project is not affiliated with MITRE Corporation or the official Synthea project. It's an independent web interface built on top of Synthea.
# Synthea Studio

Open-source configuration UI for [Synthea™](https://github.com/synthetichealth/synthea) synthetic patient population generation.

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI](https://github.com/synthea-studio/synthea-studio/workflows/CI/badge.svg)](https://github.com/synthea-studio/synthea-studio/actions)
[![Synthea](https://img.shields.io/badge/Powered%20by-Synthea-blue)](https://synthetichealth.github.io/synthea/)

## Overview

Synthea Studio provides a modern web interface for configuring and generating synthetic patient populations using [Synthea™ Patient Generator](https://github.com/synthetichealth/synthea). It adds population management, job tracking, and batch operations on top of Synthea's powerful generation capabilities.

### About Synthea™

[Synthea™](https://synthetichealth.github.io/synthea/) is a synthetic patient generator developed by [The MITRE Corporation](https://www.mitre.org/) that models the medical history of synthetic patients. It provides high-quality, synthetic, realistic but not real, patient data and associated health records covering every aspect of healthcare. The resulting data is free from cost, privacy, and security restrictions, enabling research with Health IT data that is otherwise legally or practically unavailable.

**Learn more about Synthea:**
- [Official Documentation](https://synthetichealth.github.io/synthea/)
- [GitHub Repository](https://github.com/synthetichealth/synthea)
- [Wiki & Tutorials](https://github.com/synthetichealth/synthea/wiki)
- [Research Publications](https://synthetichealth.github.io/synthea/publications)
- [Community Forum](https://groups.google.com/g/synthea)

## Features

- **Visual Population Builder** - Configure demographics, conditions, and modules through an intuitive UI
- **Population Management** - Track, organize, and manage multiple synthetic populations
- **Real-time Progress** - Monitor generation progress with WebSocket updates
- **Batch Operations** - Generate, delete, or export populations in bulk
- **Pre-built Templates** - Start quickly with templates for common research scenarios
- **Job Tracking** - Full audit trail of generation jobs with configurations and logs
- **Flexible Storage** - Support for local, S3, MinIO, and Azure storage backends
- **Async Processing** - Non-blocking generation using Celery workers
- **Standalone & Embeddable** - Run as independent app or integrate into existing platforms

## Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/synthea-studio/synthea-studio.git
cd synthea-studio

# Standalone mode (full stack)
docker-compose -f docker-compose.standalone.yml up -d

# Visit http://localhost:3003
```

### Manual Setup

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --port 8001

# Frontend
cd packages/core
npm install
npm run dev  # Runs on port 3003

# Database
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:14

# Redis (for Celery)
docker run -d -p 6379:6379 redis:7
```

## Architecture

### Deployment Modes

Synthea Studio supports two deployment modes:

1. **Standalone Mode**: Full stack deployment with Docker
   - Frontend served from Docker container (port 3003)
   - Backend API running in Docker (port 8001)
   - PostgreSQL and Redis in Docker
   - Use `docker-compose.standalone.yml`

2. **Embedded Mode**: Backend in Docker, frontend as NPM package
   - Backend-only Docker deployment
   - Frontend distributed as NPM package `@synthea-studio/core`
   - Can be integrated into existing React applications
   - Use `docker-compose.backend.yml` for backend

### System Architecture
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│  FastAPI     │────▶│   Synthea    │
│  (Port 3003) │     │  (Port 8001) │     │   (Java)     │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
              ┌──────────┐  ┌──────────┐
              │PostgreSQL│  │  Redis   │
              └──────────┘  └──────────┘
```

## Population Concept

In Synthea Studio, a **population** represents a single generation run of Synthea with specific configuration. Each population:
- Has a unique ID (e.g., `pop_20240112_diabetes_100`)
- Maintains its generation configuration
- Can be individually managed (view, export, delete)
- Tracks all generated patients and their artifacts

## Configuration

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/synthea_studio
REDIS_URL=redis://localhost:6379
STORAGE_BACKEND=local  # or 's3', 'minio', 'azure'
STORAGE_PATH=/var/lib/synthea-studio/storage

# Frontend
REACT_APP_API_URL=http://localhost:8001
REACT_APP_WS_URL=ws://localhost:8001
```

### Storage Backends

```python
# Local (Development)
STORAGE_BACKEND=local
STORAGE_PATH=/path/to/storage

# S3/MinIO
STORAGE_BACKEND=s3
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=synthea-populations

# Azure Blob Storage
STORAGE_BACKEND=azure
AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=https;...
AZURE_CONTAINER=synthea-populations
```

## API Examples

### Create a Population

```bash
curl -X POST http://localhost:8001/api/populations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Diabetes Study Q1 2024",
    "size": 100,
    "config": {
      "modules": ["diabetes"],
      "age_range": [40, 70],
      "gender_distribution": {"M": 0.5, "F": 0.5}
    }
  }'
```

### List Populations

```bash
curl http://localhost:8001/api/populations
```

### Delete a Population

```bash
curl -X DELETE http://localhost:8001/api/populations/pop_20240112_001
```

## Embedding Synthea Studio

Synthea Studio can be embedded into your application as an NPM package:

### Installation

```bash
npm install @synthea-studio/core
```

### JavaScript/React Integration

```javascript
import { SyntheaStudio } from '@synthea-studio/core';

// Use as a component
function YourApp() {
  return (
    <SyntheaStudio
      mode="compact"
      apiUrl="http://localhost:8001"
      onPopulationCreated={(population) => {
        console.log('Population created:', population);
      }}
    />
  );
}
```

### Backend Deployment for Embedded Mode

```bash
# Deploy backend services only
docker-compose -f docker-compose.backend.yml up -d
```

### Configuration Options

```javascript
<SyntheaStudio
  // Display mode
  mode="full" | "compact" | "widget"

  // API configuration
  apiUrl="http://your-api-server:8001"

  // Feature flags
  features={{
    showHeader: false,
    allowDelete: true,
    allowExport: true
  }}

  // Callbacks
  onPopulationCreated={(population) => {}}
  onPatientsGenerated={(patients) => {}}
  onError={(error) => {}}
/>
```

See [INTEGRATION.md](INTEGRATION.md) for detailed integration instructions.

## Integration with External Systems

### Export to FHIR Server

```python
from synthea_studio import PopulationExporter

exporter = PopulationExporter()
exporter.export_to_fhir_server(
    population_id="pop_20240112_001",
    fhir_server_url="http://localhost:8080/fhir",
    batch_size=10
)
```

### Load into EHR Simulator

```bash
# Export population as FHIR bundles
curl http://localhost:8001/api/populations/pop_20240112_001/export?format=fhir

# Import into EHR simulator
curl -X POST http://localhost:8080/api/import \
  -H "Content-Type: application/json" \
  -d '{"source": "http://localhost:8001/exports/pop_20240112_001.zip"}'
```

## Development

### Project Structure

```
synthea-studio/
├── packages/
│   └── core/          # React frontend application
├── backend/           # FastAPI backend
├── docker-compose.standalone.yml  # Full stack deployment
├── docker-compose.backend.yml     # Backend-only for embedded mode
└── docs/             # Documentation
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd packages/core
npm test

# End-to-end tests
docker-compose -f docker-compose.test.yml up
```

### Building for Production

#### Standalone Mode (Docker)

```bash
# Build and run all services
docker-compose -f docker-compose.standalone.yml build
docker-compose -f docker-compose.standalone.yml up -d
```

#### Embedded Mode (NPM Package)

```bash
# Build the NPM package
cd packages/core
npm run build:lib

# Publish to NPM (if authorized)
npm publish

# Or use locally via npm link
npm link
```

### Development Mode

```bash
# Frontend development with Vite hot-reload
cd packages/core
npm run dev

# Backend development with auto-reload
cd backend
uvicorn app.main:app --reload --port 8001

# Or use Docker for full stack development
docker-compose -f docker-compose.standalone.yml up
```

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
- **[SyntheticHealth Community](https://groups.google.com/g/synthea)** - For continuous improvements and contributions

### Synthea License
Synthea™ is a Trademark of The MITRE Corporation. Synthea is licensed under the Apache License, Version 2.0. This project (Synthea Studio) is an independent UI layer and is not affiliated with or endorsed by The MITRE Corporation.

## Support

- [Documentation](https://synthea-studio.github.io/docs)
- [Discussions](https://github.com/synthea-studio/synthea-studio/discussions)
- [Issue Tracker](https://github.com/synthea-studio/synthea-studio/issues)

## Roadmap

- [ ] Phase 1: Core population management (Current)
- [ ] Phase 2: Advanced configuration UI
- [ ] Phase 3: Multi-tenancy support
- [ ] Phase 4: Cloud deployment templates
- [ ] Phase 5: Plugin system for custom modules

---

**Note**: This project is not affiliated with MITRE Corporation or the official Synthea project. It's a community-driven UI layer built on top of Synthea.
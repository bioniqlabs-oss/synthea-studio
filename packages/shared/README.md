# Synthea Studio Shared Library

Shared models, schemas, and utilities for Synthea Studio services.

## Installation

```bash
pip install -e .
```

For development:
```bash
pip install -e ".[dev]"
```

## Usage

### Models

```python
from shared.models import Population, FHIRResource, DatabaseManager

# Create database manager
db = DatabaseManager("postgresql://user:pass@localhost/synthea")
db.create_tables()

# Use models
with db.get_session() as session:
    population = Population(
        id="pop_001",
        name="Test Population",
        patient_count=100,
        config={"state": "MA"}
    )
    session.add(population)
    session.commit()
```

### Schemas

```python
from shared.schemas import PopulationCreate, FHIRPatient

# Validate API input
pop_create = PopulationCreate(
    name="My Population",
    size=50,
    config={"export_fhir": True}
)

# Validate FHIR resources
patient = FHIRPatient(
    id="patient-123",
    gender="male",
    birthDate="1980-01-01"
)
```

### Utilities

```python
from shared.utils import load_bundles, RedisPublisher

# Load FHIR bundles
bundles = load_bundles("/tmp/synthea-output/pop_001")

# Publish progress updates
publisher = RedisPublisher("redis://localhost:6379")
publisher.publish_progress("pop_001", 50, "Generating patients...")
```

## Database Migrations

```bash
# Create a new migration
alembic revision --autogenerate -m "Add new field"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=shared --cov-report=html

# Run specific test file
pytest tests/test_models.py
```

## Structure

```
shared/
├── models/          # SQLAlchemy database models
│   ├── base.py      # Base classes and database manager
│   ├── population.py # Population and job models
│   └── fhir_resources.py # FHIR resource models
├── schemas/         # Pydantic validation schemas
│   ├── population.py # Population API schemas
│   └── fhir.py      # FHIR resource schemas
├── utils/           # Utility functions
│   ├── fhir_parser.py # FHIR bundle parsing
│   └── redis_pubsub.py # Redis pub/sub helpers
└── config.py        # Shared configuration
```
"""Test configuration for worker service"""

import pytest
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shared.models import Base
from app.core.database import DatabaseManager
from app.core.config import settings


@pytest.fixture
def test_database():
    """Create test database"""
    # Use in-memory SQLite for tests
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    yield session

    session.close()
    engine.dispose()


@pytest.fixture
def db_manager(test_database):
    """Mock database manager with test database"""
    manager = MagicMock(spec=DatabaseManager)
    manager.get_session.return_value.__enter__.return_value = test_database
    manager.get_session.return_value.__exit__.return_value = None
    return manager


@pytest.fixture
def mock_redis():
    """Mock Redis client"""
    from unittest.mock import MagicMock
    redis = MagicMock()
    redis.publish.return_value = 1
    return redis


@pytest.fixture
def mock_synthea_wrapper():
    """Mock Synthea wrapper"""
    from unittest.mock import MagicMock
    wrapper = MagicMock()
    wrapper.generate_population.return_value = {
        "success": True,
        "population_id": "test-pop-123",
        "patient_count": 10,
        "output_path": "/tmp/test-output",
        "files": {
            "fhir": ["/tmp/test-output/fhir/bundle1.json"],
            "csv": [],
            "ccda": [],
            "metadata": []
        }
    }
    return wrapper


@pytest.fixture
def temp_output_dir():
    """Create temporary output directory"""
    with tempfile.TemporaryDirectory() as tmpdir:
        output_dir = Path(tmpdir) / "synthea_output"
        output_dir.mkdir(parents=True, exist_ok=True)

        # Create sample FHIR output
        fhir_dir = output_dir / "fhir"
        fhir_dir.mkdir(parents=True, exist_ok=True)

        yield output_dir


@pytest.fixture
def sample_fhir_bundle():
    """Sample FHIR bundle for testing"""
    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-123",
                    "name": [{"given": ["John"], "family": "Doe"}],
                    "gender": "male",
                    "birthDate": "1990-01-01"
                },
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "condition-123",
                    "subject": {"reference": "Patient/patient-123"},
                    "code": {
                        "coding": [{
                            "system": "http://snomed.info/sct",
                            "code": "38341003",
                            "display": "Hypertension"
                        }]
                    },
                    "onsetDateTime": "2020-01-01"
                },
                "request": {
                    "method": "POST",
                    "url": "Condition"
                }
            }
        ]
    }


@pytest.fixture
def mock_celery_task():
    """Mock Celery task context"""
    from unittest.mock import MagicMock
    task = MagicMock()
    task.request.id = "test-task-123"
    task.update_state = MagicMock()
    return task
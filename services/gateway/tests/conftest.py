"""Test configuration for API Gateway"""

import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.core.service_registry import ServiceRegistry, ServiceInfo, ServiceStatus


@pytest.fixture
def test_client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_service_registry():
    """Create mock service registry"""
    registry = AsyncMock(spec=ServiceRegistry)

    # Mock FHIR service
    fhir_service = ServiceInfo("fhir", "http://fhir:8002", "/health")
    fhir_service.status = ServiceStatus.HEALTHY

    # Mock worker service
    worker_service = ServiceInfo("worker", "http://worker:8003", "/health")
    worker_service.status = ServiceStatus.HEALTHY

    registry.get_service.side_effect = lambda name: {
        "fhir": fhir_service,
        "worker": worker_service
    }.get(name)

    registry.get_all_services.return_value = {
        "fhir": fhir_service,
        "worker": worker_service
    }

    registry.get_healthy_services.return_value = {
        "fhir": fhir_service,
        "worker": worker_service
    }

    # Mock service calls
    async def mock_call_service(service_name, method, path, **kwargs):
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {"status": "ok"}
        response.text = "OK"
        return response

    registry.call_service = mock_call_service

    return registry


@pytest.fixture
def mock_redis_client():
    """Create mock Redis client"""
    redis_client = AsyncMock()
    redis_client.get.return_value = None
    redis_client.set.return_value = True
    redis_client.setex.return_value = True
    redis_client.delete.return_value = 1
    redis_client.keys.return_value = []
    redis_client.publish.return_value = 1

    return redis_client


@pytest.fixture
def mock_celery_app():
    """Create mock Celery app"""
    celery_app = MagicMock()

    # Mock task sending
    task = MagicMock()
    task.id = "test-task-123"
    celery_app.send_task.return_value = task

    return celery_app


@pytest.fixture
def sample_population():
    """Sample population data"""
    return {
        "id": "test-pop-123",
        "name": "Test Population",
        "size": 100,
        "status": "PENDING",
        "created_at": "2024-01-01T00:00:00Z"
    }


@pytest.fixture
def sample_fhir_bundle():
    """Sample FHIR bundle"""
    return {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-123",
                    "name": [{"given": ["John"], "family": "Doe"}]
                },
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            }
        ]
    }


@pytest.fixture
def auth_headers():
    """Authentication headers for testing"""
    return {"Authorization": "Bearer test-token-123"}
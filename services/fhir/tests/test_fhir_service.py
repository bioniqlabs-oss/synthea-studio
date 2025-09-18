"""Integration tests for FHIR service"""

import pytest
import json
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.core.database import get_db
from shared.models import Base


@pytest.fixture
async def test_db():
    """Create test database"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async def override_get_db():
        async with AsyncSessionLocal() as session:
            yield session
    
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()


@pytest.fixture
async def client(test_db):
    """Create test client"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """Test health check endpoint"""
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_capability_statement(client: AsyncClient):
    """Test capability statement"""
    response = await client.get("/metadata")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "CapabilityStatement"
    assert data["fhirVersion"] == "4.0.1"


@pytest.mark.asyncio
async def test_create_patient(client: AsyncClient):
    """Test creating a patient"""
    patient = {
        "resourceType": "Patient",
        "name": [{
            "family": "Test",
            "given": ["John"]
        }],
        "gender": "male",
        "birthDate": "1990-01-01"
    }
    
    response = await client.post("/Patient", json=patient)
    assert response.status_code == 201
    assert "Location" in response.headers


@pytest.mark.asyncio
async def test_search_patients(client: AsyncClient):
    """Test searching for patients"""
    # Create a patient first
    patient = {
        "resourceType": "Patient",
        "name": [{"family": "Smith", "given": ["Jane"]}],
        "gender": "female"
    }
    await client.post("/Patient", json=patient)
    
    # Search for patients
    response = await client.get("/Patient")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert len(data["entry"]) >= 1


@pytest.mark.asyncio
async def test_process_bundle(client: AsyncClient):
    """Test processing a FHIR bundle"""
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-123",
                    "name": [{"family": "Bundle", "given": ["Test"]}],
                    "gender": "male"
                },
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "condition-456",
                    "subject": {"reference": "Patient/patient-123"},
                    "code": {
                        "coding": [{
                            "system": "http://snomed.info/sct",
                            "code": "73211009",
                            "display": "Diabetes"
                        }]
                    }
                },
                "request": {
                    "method": "POST",
                    "url": "Condition"
                }
            }
        ]
    }
    
    response = await client.post("/", json=bundle)
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "transaction-response"
    assert len(data["entry"]) == 2
    
    # Verify resources were created
    for entry in data["entry"]:
        assert entry["response"]["status"] == "201"


@pytest.mark.asyncio
async def test_patient_everything(client: AsyncClient):
    """Test $everything operation"""
    # Create patient and related resources
    patient = {
        "resourceType": "Patient",
        "id": "test-patient-001",
        "name": [{"family": "Everything", "given": ["Test"]}]
    }
    
    response = await client.post("/Patient", json=patient)
    assert response.status_code == 201
    
    # Get patient ID from Location header
    location = response.headers["Location"]
    patient_id = location.split("/")[-1]
    
    # Get everything for the patient
    response = await client.get(f"/Patient/{patient_id}/$everything")
    assert response.status_code == 200
    data = response.json()
    assert data["resourceType"] == "Bundle"
    assert len(data["entry"]) >= 1  # At least the patient itself


@pytest.mark.asyncio
async def test_search_with_filters(client: AsyncClient):
    """Test searching with filters"""
    # Create patients with different attributes
    patients = [
        {
            "resourceType": "Patient",
            "name": [{"family": "Johnson", "given": ["Alice"]}],
            "gender": "female",
            "birthDate": "1980-05-15"
        },
        {
            "resourceType": "Patient",
            "name": [{"family": "Johnson", "given": ["Bob"]}],
            "gender": "male",
            "birthDate": "1975-03-20"
        }
    ]
    
    for patient in patients:
        await client.post("/Patient", json=patient)
    
    # Search by gender
    response = await client.get("/Patient?gender=female")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entry"]) >= 1
    
    # Search by name
    response = await client.get("/Patient?name=Johnson")
    assert response.status_code == 200
    data = response.json()
    assert len(data["entry"]) >= 2
"""Unit tests for shared schemas"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from shared.schemas import (
    PopulationStatus,
    PopulationConfig,
    PopulationCreate,
    PopulationResponse,
    FHIRPatient,
    FHIRBundle,
    FHIRSearchParameters,
)


def test_population_config_validation():
    """Test PopulationConfig validation"""
    # Valid config
    config = PopulationConfig(
        modules=["diabetes", "hypertension"],
        age_range=[20, 80],
        gender_distribution={"M": 0.4, "F": 0.6},
        state="California"
    )
    assert config.state == "California"
    assert len(config.modules) == 2
    
    # Invalid gender distribution (doesn't sum to 1)
    with pytest.raises(ValidationError) as exc_info:
        PopulationConfig(
            gender_distribution={"M": 0.3, "F": 0.5}  # Sums to 0.8
        )
    assert "must sum to 1.0" in str(exc_info.value)
    
    # Invalid age range (wrong length)
    with pytest.raises(ValidationError) as exc_info:
        PopulationConfig(age_range=[20])
    

def test_population_create_schema():
    """Test PopulationCreate schema"""
    # Valid creation
    pop_create = PopulationCreate(
        name="Test Population",
        description="A test",
        size=100,
        config=PopulationConfig()
    )
    assert pop_create.size == 100
    assert pop_create.config.export_fhir is True  # Default value
    
    # Invalid size (too large)
    with pytest.raises(ValidationError):
        PopulationCreate(
            name="Test",
            size=20000  # Max is 10000
        )
    
    # Invalid size (negative)
    with pytest.raises(ValidationError):
        PopulationCreate(
            name="Test",
            size=-5
        )
    
    # Invalid name (empty)
    with pytest.raises(ValidationError):
        PopulationCreate(
            name="",
            size=10
        )


def test_population_response_schema():
    """Test PopulationResponse schema"""
    response = PopulationResponse(
        id="pop_001",
        name="Test Population",
        description="Test description",
        patient_count=50,
        config={"state": "MA"},
        status=PopulationStatus.COMPLETED,
        progress=100,
        storage_path="/tmp/synthea/pop_001",
        created_at=datetime.utcnow(),
        started_at=datetime.utcnow(),
        completed_at=datetime.utcnow()
    )
    
    assert response.status == PopulationStatus.COMPLETED
    assert response.progress == 100
    
    # Test model_config from_attributes
    response_dict = response.model_dump()
    assert response_dict["id"] == "pop_001"
    assert response_dict["patient_count"] == 50


def test_fhir_patient_schema():
    """Test FHIRPatient schema"""
    patient = FHIRPatient(
        id="patient-123",
        name=[{
            "use": "official",
            "family": "Smith",
            "given": ["John", "Jacob"]
        }],
        gender="male",
        birthDate="1980-05-15"
    )
    
    assert patient.resourceType == "Patient"
    assert patient.id == "patient-123"
    assert patient.gender == "male"
    assert len(patient.name) == 1
    assert patient.name[0]["family"] == "Smith"


def test_fhir_bundle_schema():
    """Test FHIRBundle schema"""
    bundle = FHIRBundle(
        type="transaction",
        entry=[
            {
                "fullUrl": "urn:uuid:patient-123",
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-123"
                },
                "request": {
                    "method": "POST",
                    "url": "Patient"
                }
            }
        ]
    )
    
    assert bundle.resourceType == "Bundle"
    assert bundle.type == "transaction"
    assert len(bundle.entry) == 1
    assert bundle.entry[0]["resource"]["id"] == "patient-123"


def test_fhir_search_parameters():
    """Test FHIRSearchParameters schema"""
    # Default values
    params = FHIRSearchParameters()
    assert params._count == 20
    assert params._offset == 0
    
    # Custom values
    params = FHIRSearchParameters(
        _count=50,
        _offset=100,
        _sort="-date",
        _include=["Patient:organization"]
    )
    assert params._count == 50
    assert params._offset == 100
    assert params._sort == "-date"
    
    # Invalid count (too large)
    with pytest.raises(ValidationError):
        FHIRSearchParameters(_count=200)  # Max is 100
    
    # Invalid offset (negative)
    with pytest.raises(ValidationError):
        FHIRSearchParameters(_offset=-10)
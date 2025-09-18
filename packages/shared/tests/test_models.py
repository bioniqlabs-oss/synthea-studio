"""Unit tests for shared models"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from shared.models import (
    Base,
    DatabaseManager,
    Population,
    PopulationStatus,
    GenerationJob,
    FHIRResource,
    FHIRBundle,
)


@pytest.fixture
def db_session():
    """Create a test database session"""
    # Use in-memory SQLite for tests
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    yield session
    session.close()


def test_population_model(db_session):
    """Test Population model"""
    population = Population(
        id="test_pop_001",
        name="Test Population",
        description="A test population",
        patient_count=100,
        config={"state": "Massachusetts", "export_fhir": True},
        status=PopulationStatus.PENDING
    )
    
    db_session.add(population)
    db_session.commit()
    
    # Retrieve and verify
    saved_pop = db_session.query(Population).filter_by(id="test_pop_001").first()
    assert saved_pop is not None
    assert saved_pop.name == "Test Population"
    assert saved_pop.patient_count == 100
    assert saved_pop.status == PopulationStatus.PENDING
    assert saved_pop.config["state"] == "Massachusetts"
    
    # Test to_dict method
    pop_dict = saved_pop.to_dict()
    assert pop_dict["id"] == "test_pop_001"
    assert pop_dict["name"] == "Test Population"
    assert "statistics" in pop_dict


def test_generation_job_model(db_session):
    """Test GenerationJob model"""
    # Create population first
    population = Population(
        id="test_pop_002",
        name="Test Population 2",
        patient_count=50,
        config={}
    )
    db_session.add(population)
    db_session.commit()
    
    # Create job
    job = GenerationJob(
        population_id="test_pop_002",
        celery_task_id="celery-task-123",
        status="PENDING",
        progress=0
    )
    
    db_session.add(job)
    db_session.commit()
    
    # Verify
    saved_job = db_session.query(GenerationJob).filter_by(
        population_id="test_pop_002"
    ).first()
    assert saved_job is not None
    assert saved_job.celery_task_id == "celery-task-123"
    assert saved_job.status == "PENDING"
    assert saved_job.progress == 0
    
    # Test relationship
    assert saved_job.population.name == "Test Population 2"


def test_fhir_resource_model(db_session):
    """Test FHIRResource model"""
    patient_resource = {
        "resourceType": "Patient",
        "id": "patient-123",
        "name": [{"family": "Doe", "given": ["John"]}],
        "gender": "male",
        "birthDate": "1980-01-01"
    }
    
    fhir_resource = FHIRResource.from_fhir(patient_resource, population_id="test_pop")
    
    assert fhir_resource.resource_type == "Patient"
    assert fhir_resource.resource_id == "patient-123"
    assert fhir_resource.patient_id == "patient-123"
    assert fhir_resource.population_id == "test_pop"
    
    db_session.add(fhir_resource)
    db_session.commit()
    
    # Test to_fhir method
    fhir_output = fhir_resource.to_fhir()
    assert fhir_output["resourceType"] == "Patient"
    assert "meta" in fhir_output
    assert fhir_output["meta"]["versionId"] == "1"
    
    # Test display_name property
    assert "John Doe" in fhir_resource.display_name


def test_fhir_bundle_model(db_session):
    """Test FHIRBundle model"""
    bundle = {
        "resourceType": "Bundle",
        "type": "transaction",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "patient-456",
                    "gender": "female"
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "condition-789",
                    "subject": {"reference": "Patient/patient-456"}
                }
            }
        ]
    }
    
    fhir_bundle = FHIRBundle(
        bundle_type="transaction",
        bundle=bundle,
        population_id="test_pop"
    )
    
    db_session.add(fhir_bundle)
    db_session.commit()
    
    # Process the bundle
    created_resources = fhir_bundle.process(db_session)
    db_session.commit()
    
    assert len(created_resources) == 2
    assert fhir_bundle.resource_count == 2
    assert fhir_bundle.status == "completed"
    assert fhir_bundle.processed_at is not None
    
    # Verify resources were created
    patient = db_session.query(FHIRResource).filter_by(
        resource_type="Patient",
        resource_id="patient-456"
    ).first()
    assert patient is not None
    assert patient.patient_id == "patient-456"
    
    condition = db_session.query(FHIRResource).filter_by(
        resource_type="Condition",
        resource_id="condition-789"
    ).first()
    assert condition is not None
    assert condition.patient_id == "patient-456"


def test_database_manager():
    """Test DatabaseManager"""
    db_manager = DatabaseManager("sqlite:///:memory:")
    
    # Create tables
    db_manager.create_tables()
    
    # Get session and test it
    session = db_manager.get_session()
    assert session is not None
    
    # Add a population
    population = Population(
        id="test_mgr_pop",
        name="Manager Test",
        patient_count=10,
        config={}
    )
    session.add(population)
    session.commit()
    
    # Verify
    saved = session.query(Population).filter_by(id="test_mgr_pop").first()
    assert saved is not None
    assert saved.name == "Manager Test"
    
    session.close()
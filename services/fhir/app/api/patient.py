"""FHIR Patient resource endpoints"""

from fastapi import APIRouter, HTTPException, Depends, Response, Query
from typing import Dict, Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.fhir_store import FHIRStore
from shared.schemas import FHIRPatient, FHIRSearchParameters

router = APIRouter()


@router.get("")
async def search_patients(
    # Common parameters
    _count: int = Query(20, ge=1, le=100),
    _offset: int = Query(0, ge=0),
    _sort: Optional[str] = None,
    # Patient-specific search parameters
    name: Optional[str] = None,
    family: Optional[str] = None,
    given: Optional[str] = None,
    gender: Optional[str] = None,
    birthdate: Optional[str] = None,
    identifier: Optional[str] = None,
    # Database
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Search for Patient resources"""
    store = FHIRStore(db)
    
    # Build search parameters
    search_params = FHIRSearchParameters(
        _count=_count,
        _offset=_offset,
        _sort=_sort
    )
    
    # Build filters
    filters = {}
    if name:
        filters["name"] = name
    if family:
        filters["family"] = family
    if given:
        filters["given"] = given
    if gender:
        filters["gender"] = gender
    if birthdate:
        filters["birthdate"] = birthdate
    if identifier:
        filters["identifier"] = identifier
    
    return await store.search_resources("Patient", search_params, **filters)


@router.get("/{patient_id}")
async def get_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get a specific Patient by ID"""
    store = FHIRStore(db)
    patient = await store.get_resource("Patient", patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return patient


@router.post("")
async def create_patient(
    patient: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Response:
    """Create a new Patient resource"""
    # Validate resource type
    if patient.get("resourceType") != "Patient":
        raise HTTPException(
            status_code=400,
            detail="Resource must be of type Patient"
        )
    
    store = FHIRStore(db)
    created = await store.create_resource(patient)
    
    return Response(
        content=None,
        status_code=201,
        headers={
            "Location": f"/Patient/{created['id']}"
        }
    )


@router.put("/{patient_id}")
async def update_patient(
    patient_id: str,
    patient: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Update an existing Patient"""
    if patient.get("resourceType") != "Patient":
        raise HTTPException(
            status_code=400,
            detail="Resource must be of type Patient"
        )
    
    store = FHIRStore(db)
    updated = await store.update_resource("Patient", patient_id, patient)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return updated


@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    db: AsyncSession = Depends(get_db)
) -> Response:
    """Delete a Patient"""
    store = FHIRStore(db)
    deleted = await store.delete_resource("Patient", patient_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return Response(status_code=204)


@router.get("/{patient_id}/$everything")
async def patient_everything(
    patient_id: str,
    _count: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get all resources related to a patient
    
    This is a FHIR operation that returns all resources
    associated with a patient in a single bundle.
    """
    store = FHIRStore(db)
    bundle = await store.get_patient_everything(patient_id)
    
    if not bundle:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    return bundle
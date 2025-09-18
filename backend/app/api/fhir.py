"""
FHIR Server API endpoints
"""
from fastapi import APIRouter, HTTPException, Query, Response
from typing import Optional, Dict, Any, List
from datetime import datetime
import json
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.models.population import Population
from fastapi import Depends

router = APIRouter()

# In-memory FHIR storage for now (will be replaced with database)
fhir_store: Dict[str, List[Dict[str, Any]]] = {
    "Patient": [],
    "Condition": [],
    "Observation": [],
    "Procedure": [],
    "MedicationRequest": [],
    "Encounter": [],
}


def create_bundle(resource_type: str, resources: List[Dict[str, Any]], total: int, offset: int = 0, count: int = 20):
    """Create a FHIR Bundle response"""
    bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": total,
        "link": [],
        "entry": []
    }

    for resource in resources:
        bundle["entry"].append({
            "fullUrl": f"urn:uuid:{resource.get('id', str(uuid.uuid4()))}",
            "resource": resource,
            "search": {"mode": "match"}
        })

    return bundle


@router.get("/metadata")
async def capability_statement():
    """Return FHIR server capability statement"""
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": datetime.now().isoformat(),
        "kind": "instance",
        "software": {
            "name": "Synthea Studio FHIR Server",
            "version": "1.0.0"
        },
        "implementation": {
            "description": "Synthea Studio integrated FHIR server"
        },
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "rest": [{
            "mode": "server",
            "resource": [
                {
                    "type": "Patient",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"},
                        {"code": "update"},
                        {"code": "delete"}
                    ],
                    "searchParam": [
                        {"name": "name", "type": "string"},
                        {"name": "birthdate", "type": "date"},
                        {"name": "gender", "type": "token"}
                    ]
                },
                {
                    "type": "Condition",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "code", "type": "token"}
                    ]
                },
                {
                    "type": "Observation",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "code", "type": "token"},
                        {"name": "date", "type": "date"}
                    ]
                }
            ]
        }]
    }


@router.post("/")
async def process_bundle(bundle: Dict[str, Any]):
    """Process a FHIR Bundle transaction"""
    if bundle.get("resourceType") != "Bundle":
        raise HTTPException(status_code=400, detail="Not a Bundle resource")

    if bundle.get("type") not in ["transaction", "batch"]:
        raise HTTPException(status_code=400, detail="Only transaction and batch bundles are supported")

    response_bundle = {
        "resourceType": "Bundle",
        "type": "transaction-response",
        "entry": []
    }

    for entry in bundle.get("entry", []):
        resource = entry.get("resource")
        if not resource:
            continue

        resource_type = resource.get("resourceType")
        if not resource_type:
            continue

        # Generate ID if not present
        if "id" not in resource:
            resource["id"] = str(uuid.uuid4())

        # Add metadata
        resource["meta"] = {
            "versionId": "1",
            "lastUpdated": datetime.now().isoformat()
        }

        # Store the resource based on type
        if resource_type in fhir_store:
            fhir_store[resource_type].append(resource)

            # Add to response bundle
            response_bundle["entry"].append({
                "response": {
                    "status": "201",
                    "location": f"{resource_type}/{resource['id']}"
                }
            })
        else:
            response_bundle["entry"].append({
                "response": {
                    "status": "422",
                    "outcome": {
                        "issue": [{
                            "severity": "error",
                            "code": "not-supported",
                            "details": {"text": f"Resource type {resource_type} not supported"}
                        }]
                    }
                }
            })

    return response_bundle


@router.get("/Patient")
async def search_patients(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    name: Optional[str] = None,
    gender: Optional[str] = None,
    birthdate: Optional[str] = None
):
    """Search for patients"""
    # Filter patients based on search parameters
    patients = fhir_store.get("Patient", [])
    filtered = patients

    if name:
        filtered = [p for p in filtered if any(
            name.lower() in n.get("family", "").lower() or
            any(name.lower() in g for g in n.get("given", []))
            for n in p.get("name", [])
        )]

    if gender:
        filtered = [p for p in filtered if p.get("gender", "").lower() == gender.lower()]

    if birthdate:
        filtered = [p for p in filtered if p.get("birthDate", "") == birthdate]

    # Paginate
    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("Patient", page_results, total, _offset, _count)


@router.get("/Patient/{patient_id}")
async def get_patient(patient_id: str):
    """Get a specific patient by ID"""
    patients = [p for p in fhir_store.get("Patient", []) if p.get("id") == patient_id]
    if not patients:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patients[0]


@router.post("/Patient")
async def create_patient(patient: Dict[str, Any]):
    """Create a new patient"""
    if "id" not in patient:
        patient["id"] = str(uuid.uuid4())

    patient["resourceType"] = "Patient"
    patient["meta"] = {
        "versionId": "1",
        "lastUpdated": datetime.now().isoformat()
    }

    fhir_store["Patient"].append(patient)

    return Response(
        content=json.dumps(patient),
        status_code=201,
        headers={
            "Location": f"/fhir/Patient/{patient['id']}"
        },
        media_type="application/json"
    )


@router.put("/Patient/{patient_id}")
async def update_patient(patient_id: str, patient: Dict[str, Any]):
    """Update an existing patient"""
    patients = fhir_store.get("Patient", [])
    for i, p in enumerate(patients):
        if p.get("id") == patient_id:
            patient["id"] = patient_id
            patient["resourceType"] = "Patient"
            patient["meta"] = {
                "versionId": str(int(p.get("meta", {}).get("versionId", 0)) + 1),
                "lastUpdated": datetime.now().isoformat()
            }
            fhir_store["Patient"][i] = patient
            return patient

    raise HTTPException(status_code=404, detail="Patient not found")


@router.delete("/Patient/{patient_id}")
async def delete_patient(patient_id: str):
    """Delete a patient"""
    patients = fhir_store.get("Patient", [])
    for i, p in enumerate(patients):
        if p.get("id") == patient_id:
            del fhir_store["Patient"][i]
            return Response(status_code=204)

    raise HTTPException(status_code=404, detail="Patient not found")


@router.get("/Patient/{patient_id}/$everything")
async def patient_everything(patient_id: str):
    """Get all resources related to a patient"""
    # Check if patient exists
    patients = [p for p in fhir_store.get("Patient", []) if p.get("id") == patient_id]
    if not patients:
        raise HTTPException(status_code=404, detail="Patient not found")

    bundle = {
        "resourceType": "Bundle",
        "type": "searchset",
        "entry": []
    }

    # Add patient
    bundle["entry"].append({
        "fullUrl": f"urn:uuid:{patient_id}",
        "resource": patients[0]
    })

    # Add related resources
    patient_ref = f"Patient/{patient_id}"

    for resource_type in ["Condition", "Observation", "Procedure", "MedicationRequest", "Encounter"]:
        resources = fhir_store.get(resource_type, [])
        for resource in resources:
            if resource.get("subject", {}).get("reference") == patient_ref:
                bundle["entry"].append({
                    "fullUrl": f"urn:uuid:{resource.get('id')}",
                    "resource": resource
                })

    bundle["total"] = len(bundle["entry"])
    return bundle


@router.get("/Condition")
async def search_conditions(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    patient: Optional[str] = None,
    code: Optional[str] = None
):
    """Search for conditions"""
    conditions = fhir_store.get("Condition", [])
    filtered = conditions

    if patient:
        patient_ref = f"Patient/{patient}" if not patient.startswith("Patient/") else patient
        filtered = [c for c in filtered if c.get("subject", {}).get("reference") == patient_ref]

    if code:
        filtered = [c for c in filtered if any(
            code in coding.get("code", "") for coding in c.get("code", {}).get("coding", [])
        )]

    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("Condition", page_results, total, _offset, _count)


@router.get("/Observation")
async def search_observations(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    patient: Optional[str] = None,
    code: Optional[str] = None,
    date: Optional[str] = None
):
    """Search for observations"""
    observations = fhir_store.get("Observation", [])
    filtered = observations

    if patient:
        patient_ref = f"Patient/{patient}" if not patient.startswith("Patient/") else patient
        filtered = [o for o in filtered if o.get("subject", {}).get("reference") == patient_ref]

    if code:
        filtered = [o for o in filtered if any(
            code in coding.get("code", "") for coding in o.get("code", {}).get("coding", [])
        )]

    if date:
        filtered = [o for o in filtered if o.get("effectiveDateTime", "").startswith(date)]

    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("Observation", page_results, total, _offset, _count)


@router.get("/Procedure")
async def search_procedures(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    patient: Optional[str] = None
):
    """Search for procedures"""
    procedures = fhir_store.get("Procedure", [])
    filtered = procedures

    if patient:
        patient_ref = f"Patient/{patient}" if not patient.startswith("Patient/") else patient
        filtered = [p for p in filtered if p.get("subject", {}).get("reference") == patient_ref]

    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("Procedure", page_results, total, _offset, _count)


@router.get("/MedicationRequest")
async def search_medications(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    patient: Optional[str] = None
):
    """Search for medication requests"""
    medications = fhir_store.get("MedicationRequest", [])
    filtered = medications

    if patient:
        patient_ref = f"Patient/{patient}" if not patient.startswith("Patient/") else patient
        filtered = [m for m in filtered if m.get("subject", {}).get("reference") == patient_ref]

    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("MedicationRequest", page_results, total, _offset, _count)


@router.get("/Encounter")
async def search_encounters(
    _count: int = Query(20, alias="_count"),
    _offset: int = Query(0, alias="_offset"),
    patient: Optional[str] = None
):
    """Search for encounters"""
    encounters = fhir_store.get("Encounter", [])
    filtered = encounters

    if patient:
        patient_ref = f"Patient/{patient}" if not patient.startswith("Patient/") else patient
        filtered = [e for e in filtered if e.get("subject", {}).get("reference") == patient_ref]

    total = len(filtered)
    start = _offset
    end = min(start + _count, total)
    page_results = filtered[start:end]

    return create_bundle("Encounter", page_results, total, _offset, _count)


async def import_synthea_patients(population_id: str, db: Session = Depends(get_db)):
    """Import generated Synthea patients into FHIR store"""
    # This will be called after generation completes
    # For now, we'll use mock data
    # In production, this would read the generated FHIR bundles from file system

    population = db.query(Population).filter(Population.id == population_id).first()
    if not population:
        return False

    # TODO: Read actual generated files from /tmp/synthea/output/fhir/
    # For now, create mock patients
    for i in range(min(population.patient_count, 10)):  # Limit to 10 for demo
        patient = {
            "id": str(uuid.uuid4()),
            "resourceType": "Patient",
            "meta": {
                "versionId": "1",
                "lastUpdated": datetime.now().isoformat()
            },
            "identifier": [{
                "system": "http://synthea.mitre.org/identifier",
                "value": f"synthea-{population_id}-{i}"
            }],
            "active": True,
            "name": [{
                "use": "official",
                "family": f"Patient{i}",
                "given": [f"Test{i}"]
            }],
            "gender": "male" if i % 2 == 0 else "female",
            "birthDate": f"{1950 + (i * 5)}-01-01"
        }
        fhir_store["Patient"].append(patient)

    return True


@router.get("/config/settings")
async def get_settings():
    """Get EHR configuration settings"""
    return {
        "fhir": {
            "version": "R4",
            "output_format": "json",
            "default_page_size": 20,
            "max_page_size": 100
        },
        "simulator": {
            "auto_import": True,
            "default_population_size": 10,
            "enable_websocket": True
        }
    }


@router.put("/config/settings")
async def update_settings(settings: Dict[str, Any]):
    """Update EHR configuration settings"""
    # In production, save to database or config file
    # For now, just return the settings
    return settings
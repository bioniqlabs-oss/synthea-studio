"""FHIR API router"""

from fastapi import APIRouter, Request, HTTPException, Query
from typing import Dict, Any, Optional, List

router = APIRouter()


@router.get("/{resource_type}")
async def search_resources(
    request: Request,
    resource_type: str,
    population_id: Optional[str] = Query(None),
    patient: Optional[str] = Query(None),
    _count: int = Query(100, le=1000),
    _offset: int = Query(0)
) -> Dict[str, Any]:
    """Search FHIR resources"""
    # Validate resource type
    valid_types = ["Patient", "Condition", "Observation", "Procedure",
                  "MedicationRequest", "Encounter", "AllergyIntolerance",
                  "Immunization", "DiagnosticReport", "CarePlan"]

    if resource_type not in valid_types:
        raise HTTPException(400, f"Invalid resource type: {resource_type}")

    # Forward to FHIR service
    registry = request.app.state.services
    params = {
        "_count": _count,
        "_offset": _offset
    }

    if population_id:
        params["population_id"] = population_id
    if patient:
        params["patient"] = patient

    response = await registry.call_service(
        "fhir",
        "GET",
        f"/fhir/{resource_type}",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/{resource_type}/{resource_id}")
async def get_resource(
    request: Request,
    resource_type: str,
    resource_id: str
) -> Dict[str, Any]:
    """Get specific FHIR resource"""
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "GET",
        f"/fhir/{resource_type}/{resource_id}"
    )

    if response.status_code == 404:
        raise HTTPException(404, f"{resource_type}/{resource_id} not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.post("/")
async def create_bundle(
    request: Request,
    bundle: Dict[str, Any]
) -> Dict[str, Any]:
    """Process FHIR Bundle transaction"""
    # Validate bundle type
    if bundle.get("resourceType") != "Bundle":
        raise HTTPException(400, "Resource must be a Bundle")

    if bundle.get("type") not in ["transaction", "batch", "collection"]:
        raise HTTPException(400, "Bundle must be transaction, batch, or collection type")

    # Forward to FHIR service
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "POST",
        "/fhir",
        json=bundle,
        timeout=settings.LONG_REQUEST_TIMEOUT  # Longer timeout for bundles
    )

    if response.status_code not in [200, 201]:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.post("/{resource_type}")
async def create_resource(
    request: Request,
    resource_type: str,
    resource: Dict[str, Any]
) -> Dict[str, Any]:
    """Create new FHIR resource"""
    # Validate resource type matches
    if resource.get("resourceType") != resource_type:
        raise HTTPException(400, f"Resource type mismatch: expected {resource_type}")

    # Forward to FHIR service
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "POST",
        f"/fhir/{resource_type}",
        json=resource
    )

    if response.status_code != 201:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.put("/{resource_type}/{resource_id}")
async def update_resource(
    request: Request,
    resource_type: str,
    resource_id: str,
    resource: Dict[str, Any]
) -> Dict[str, Any]:
    """Update FHIR resource"""
    # Validate resource
    if resource.get("resourceType") != resource_type:
        raise HTTPException(400, f"Resource type mismatch: expected {resource_type}")

    if resource.get("id") != resource_id:
        raise HTTPException(400, f"Resource ID mismatch: expected {resource_id}")

    # Forward to FHIR service
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "PUT",
        f"/fhir/{resource_type}/{resource_id}",
        json=resource
    )

    if response.status_code == 404:
        raise HTTPException(404, f"{resource_type}/{resource_id} not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.delete("/{resource_type}/{resource_id}")
async def delete_resource(
    request: Request,
    resource_type: str,
    resource_id: str
) -> Dict[str, Any]:
    """Delete FHIR resource"""
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "DELETE",
        f"/fhir/{resource_type}/{resource_id}"
    )

    if response.status_code == 404:
        raise HTTPException(404, f"{resource_type}/{resource_id} not found")
    elif response.status_code != 204:
        raise HTTPException(response.status_code, response.text)

    return {"message": f"Deleted {resource_type}/{resource_id}"}


@router.get("/_search")
async def global_search(
    request: Request,
    query: str,
    resource_types: Optional[List[str]] = Query(None),
    limit: int = Query(100, le=1000)
) -> Dict[str, Any]:
    """Global search across all resource types"""
    # Forward to FHIR service
    registry = request.app.state.services
    params = {
        "query": query,
        "limit": limit
    }

    if resource_types:
        params["resource_types"] = ",".join(resource_types)

    response = await registry.call_service(
        "fhir",
        "GET",
        "/fhir/_search",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()
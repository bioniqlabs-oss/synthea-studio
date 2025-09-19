"""Population management router"""

from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from celery import Celery

from app.core.config import settings
from app.middleware.cache import invalidate_cache

router = APIRouter()

# Celery client
celery_app = Celery(broker=settings.CELERY_BROKER_URL)


class PopulationRequest(BaseModel):
    """Population generation request"""
    name: str
    size: int
    config: Dict[str, Any] = {}


class ImportRequest(BaseModel):
    """FHIR import request"""
    population_id: str
    output_path: str


@router.get("/")
async def list_populations(
    request: Request,
    limit: int = 100,
    offset: int = 0,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """List all populations"""
    # Forward to FHIR service
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/populations",
        params={"limit": limit, "offset": offset, "status": status}
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/{population_id}")
async def get_population(request: Request, population_id: str) -> Dict[str, Any]:
    """Get population details"""
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "GET",
        f"/api/populations/{population_id}"
    )

    if response.status_code == 404:
        raise HTTPException(404, "Population not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.post("/")
async def create_population(
    request: Request,
    population_request: PopulationRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Create new population and trigger generation"""
    # Create population record in FHIR service
    registry = request.app.state.services
    response = await registry.call_service(
        "fhir",
        "POST",
        "/api/populations",
        json=population_request.dict()
    )

    if response.status_code != 201:
        raise HTTPException(response.status_code, response.text)

    population = response.json()

    # Trigger generation task
    task = celery_app.send_task(
        "worker.generate_population",
        args=[population["id"], population_request.size, population_request.config]
    )

    # Invalidate cache
    background_tasks.add_task(invalidate_cache, "populations*")

    return {
        "population": population,
        "task_id": task.id,
        "status": "generation_started"
    }


@router.delete("/{population_id}")
async def delete_population(
    request: Request,
    population_id: str,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """Delete population and all associated data"""
    registry = request.app.state.services

    # Delete from FHIR service
    response = await registry.call_service(
        "fhir",
        "DELETE",
        f"/api/populations/{population_id}"
    )

    if response.status_code == 404:
        raise HTTPException(404, "Population not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    # Trigger cleanup task
    celery_app.send_task(
        "worker.cleanup_population",
        args=[population_id]
    )

    # Invalidate cache
    background_tasks.add_task(invalidate_cache, "populations*")

    return {"message": "Population deleted", "population_id": population_id}


@router.post("/{population_id}/import")
async def import_population(
    request: Request,
    population_id: str,
    import_request: ImportRequest
) -> Dict[str, Any]:
    """Manually trigger FHIR import for a population"""
    # Trigger import task
    task = celery_app.send_task(
        "worker.import_population_to_fhir",
        args=[population_id, import_request.output_path]
    )

    return {
        "population_id": population_id,
        "task_id": task.id,
        "status": "import_started"
    }


@router.get("/{population_id}/status")
async def get_population_status(
    request: Request,
    population_id: str
) -> Dict[str, Any]:
    """Get current generation/import status"""
    registry = request.app.state.services

    # Get population from FHIR service
    response = await registry.call_service(
        "fhir",
        "GET",
        f"/api/populations/{population_id}/status"
    )

    if response.status_code == 404:
        raise HTTPException(404, "Population not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/{population_id}/statistics")
async def get_population_statistics(
    request: Request,
    population_id: str
) -> Dict[str, Any]:
    """Get population statistics"""
    registry = request.app.state.services

    # Get statistics from FHIR service
    response = await registry.call_service(
        "fhir",
        "GET",
        f"/api/populations/{population_id}/statistics"
    )

    if response.status_code == 404:
        raise HTTPException(404, "Population not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()
"""
Export endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Literal

from app.core.database import get_db
from app.models import Population
from app.models.population import PopulationStatus


router = APIRouter()


@router.get("/{population_id}")
async def export_population(
    population_id: str,
    format: Literal["fhir", "csv", "ndjson"] = "fhir",
    db: AsyncSession = Depends(get_db)
):
    """Export population data"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")
    
    if population.status != PopulationStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Population is {population.status.value}, not completed"
        )
    
    # TODO: Create export package from storage
    # For now, return a placeholder
    
    return {
        "message": "Export started",
        "population_id": population_id,
        "format": format,
        "download_url": f"/api/export/{population_id}/download"
    }


@router.get("/{population_id}/download")
async def download_export(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Download exported population data"""
    # TODO: Return actual export file
    # For now, return error
    raise HTTPException(
        status_code=501,
        detail="Export download not yet implemented"
    )
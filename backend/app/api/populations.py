"""
Population management endpoints
"""
import logging
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Population
from app.models.population import PopulationStatus

logger = logging.getLogger(__name__)


router = APIRouter()


class PopulationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    size: int
    config: dict


class PopulationResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    patient_count: int
    status: str
    config: dict
    created_at: datetime
    completed_at: Optional[datetime]
    storage_path: Optional[str]


@router.get("/", response_model=List[PopulationResponse])
async def list_populations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[PopulationStatus] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all populations"""
    query = select(Population)
    if status:
        query = query.where(Population.status == status)
    query = query.offset(skip).limit(limit).order_by(Population.created_at.desc())
    
    result = await db.execute(query)
    populations = result.scalars().all()
    
    return [
        PopulationResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            patient_count=p.patient_count,
            status=p.status.value,
            config=p.config,
            created_at=p.created_at,
            completed_at=p.completed_at,
            storage_path=p.storage_path
        )
        for p in populations
    ]


@router.get("/{population_id}", response_model=PopulationResponse)
async def get_population(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")

    return PopulationResponse(
        id=population.id,
        name=population.name,
        description=population.description,
        patient_count=population.patient_count,
        status=population.status.value,
        config=population.config,
        created_at=population.created_at,
        completed_at=population.completed_at,
        storage_path=population.storage_path
    )


@router.post("/", response_model=PopulationResponse)
async def create_population(
    data: PopulationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new population"""
    # Generate population ID
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    
    # Get highest ID for today
    result = await db.execute(
        select(Population.id).where(
            Population.id.like(f"pop_{timestamp}_%")
        ).order_by(Population.id.desc())
    )
    last_id = result.scalar()
    
    if last_id:
        # Extract the counter from the last ID
        last_count = int(last_id.split('_')[-1])
        count = last_count + 1
    else:
        count = 1
    
    population_id = f"pop_{timestamp}_{count:03d}"
    
    # Create population
    population = Population(
        id=population_id,
        name=data.name,
        description=data.description,
        patient_count=data.size,  # Store the requested size
        config=data.config,
        status=PopulationStatus.PENDING
    )
    
    db.add(population)
    await db.commit()
    await db.refresh(population)

    # Trigger generation job via Celery
    from app.workers.celery_app import celery_app
    from app.models.job import GenerationJob

    task = celery_app.send_task(
        'app.workers.generation_worker.generate_population',
        args=[population_id, population.patient_count, dict(population.config)]
    )

    # Create job record
    job = GenerationJob(
        population_id=population_id,
        celery_task_id=task.id
    )
    db.add(job)

    # Update population status
    population.status = PopulationStatus.GENERATING
    await db.commit()

    return PopulationResponse(
        id=population.id,
        name=population.name,
        description=population.description,
        patient_count=population.patient_count,
        status=population.status.value,
        config=population.config,
        created_at=population.created_at,
        completed_at=population.completed_at,
        storage_path=population.storage_path
    )


@router.get("/{population_id}/statistics")
async def get_population_statistics(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()

    if not population:
        raise HTTPException(status_code=404, detail="Population not found")

    # Return basic statistics for now
    # In a real implementation, this would query FHIR data
    return {
        "population_id": population_id,
        "patient_count": population.patient_count,
        "status": population.status.value,
        "created_at": population.created_at,
        "completed_at": population.completed_at,
        "demographics": {
            "total": population.patient_count,
            "by_gender": population.config.get("gender_distribution", {}),
            "age_range": population.config.get("age_range", [0, 100])
        },
        "conditions": {
            "modules_used": population.config.get("modules", [])
        }
    }


@router.get("/{population_id}/status")
async def get_population_status(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get generation status for a population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()

    if not population:
        raise HTTPException(status_code=404, detail="Population not found")

    # Get associated job if exists
    from app.models.job import GenerationJob
    job_result = await db.execute(
        select(GenerationJob)
        .where(GenerationJob.population_id == population_id)
        .order_by(GenerationJob.created_at.desc())
        .limit(1)
    )
    job = job_result.scalar_one_or_none()

    return {
        "population_id": population_id,
        "status": population.status.value,
        "progress": job.progress if job else 0,
        "created_at": population.created_at,
        "completed_at": population.completed_at,
        "job_id": str(job.id) if job else None,
        "celery_task_id": job.celery_task_id if job else None
    }


@router.delete("/{population_id}")
async def delete_population(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a population and its data"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")
    
    # Delete storage artifacts if they exist
    if population.storage_path:
        import shutil
        from pathlib import Path
        storage_path = Path(population.storage_path)
        if storage_path.exists():
            try:
                shutil.rmtree(storage_path)
                logger.info(f"Deleted storage artifacts at {storage_path}")
            except Exception as e:
                logger.error(f"Failed to delete storage artifacts: {e}")
                # Continue with deletion even if file cleanup fails

    # Delete the population (cascade will handle related records)
    await db.delete(population)
    await db.commit()

    logger.info(f"Successfully deleted population {population_id}")
    return {"message": f"Population {population_id} deleted successfully"}


@router.post("/{population_id}/import")
async def import_population(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger import of population data to FHIR database.
    Useful when auto-import fails during generation.
    """
    # Verify population exists
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()

    if not population:
        raise HTTPException(status_code=404, detail="Population not found")

    if population.status != PopulationStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Population must be COMPLETED to import. Current status: {population.status}"
        )

    if not population.storage_path:
        raise HTTPException(
            status_code=400,
            detail="Population has no storage path. Generation may have failed."
        )

    # Check if already imported by counting existing FHIR resources
    from app.models.fhir_resource import FhirResource
    from sqlalchemy import func

    existing_count_result = await db.execute(
        select(func.count(FhirResource.id))
        .where(FhirResource.population_id == population_id)
    )
    existing_count = existing_count_result.scalar()

    if existing_count > 0:
        return {
            "message": f"Population {population.name} already has {existing_count} FHIR resources imported",
            "population_id": population_id,
            "already_imported": True,
            "resource_count": existing_count
        }

    # Trigger import via Celery task
    from app.workers.celery_app import celery_app

    task = celery_app.send_task(
        'app.workers.generation_worker.import_patients_to_fhir_task',
        args=[population_id, population.storage_path]
    )

    logger.info(f"Triggered manual import for population {population_id}, task: {task.id}")

    return {
        "message": f"Import started for population {population.name} ({population.patient_count} patients)",
        "task_id": task.id,
        "population_id": population_id,
        "patient_count": population.patient_count
    }
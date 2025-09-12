"""
Population management endpoints
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel

from app.core.database import get_db
from app.models import Population
from app.models.population import PopulationStatus


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
            completed_at=p.completed_at
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
        completed_at=population.completed_at
    )


@router.post("/", response_model=PopulationResponse)
async def create_population(
    data: PopulationCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new population"""
    # Generate population ID
    timestamp = datetime.utcnow().strftime("%Y%m%d")
    
    # Get count for today
    result = await db.execute(
        select(Population).where(Population.id.like(f"pop_{timestamp}_%"))
    )
    existing = result.scalars().all()
    count = len(existing) + 1
    
    population_id = f"pop_{timestamp}_{count:03d}"
    
    # Create population
    population = Population(
        id=population_id,
        name=data.name,
        description=data.description,
        config=data.config,
        status=PopulationStatus.PENDING
    )
    
    db.add(population)
    await db.commit()
    await db.refresh(population)
    
    # TODO: Trigger generation job via Celery
    
    return PopulationResponse(
        id=population.id,
        name=population.name,
        description=population.description,
        patient_count=population.patient_count,
        status=population.status.value,
        config=population.config,
        created_at=population.created_at,
        completed_at=population.completed_at
    )


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
    
    # TODO: Delete storage artifacts
    
    await db.execute(
        delete(Population).where(Population.id == population_id)
    )
    await db.commit()
    
    return {"message": f"Population {population_id} deleted successfully"}
"""
Analytics endpoints
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models import Population
from app.models.population import PopulationStatus

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(db: AsyncSession = Depends(get_db)):
    """Get overall analytics overview"""
    total_populations = await db.scalar(select(func.count(Population.id)))
    completed_populations = await db.scalar(
        select(func.count(Population.id)).where(
            Population.status == PopulationStatus.COMPLETED
        )
    )
    total_patients = await db.scalar(
        select(func.sum(Population.patient_count)).where(
            Population.status == PopulationStatus.COMPLETED
        )
    ) or 0

    return {
        "total_populations": total_populations,
        "completed_populations": completed_populations,
        "total_patients_generated": total_patients,
        "average_population_size": total_patients / completed_populations if completed_populations > 0 else 0
    }


@router.get("/populations/{population_id}")
async def get_population_analytics(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get analytics for a specific population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()

    if not population:
        return {
            "population_id": population_id,
            "error": "Population not found"
        }

    return {
        "population_id": population_id,
        "name": population.name,
        "patient_count": population.patient_count,
        "status": population.status.value,
        "demographics": {
            "age_range": population.config.get("age_range", [0, 100]),
            "gender_distribution": population.config.get("gender_distribution", {})
        },
        "modules": population.config.get("modules", []),
        "created_at": population.created_at,
        "completed_at": population.completed_at
    }


@router.get("/conditions")
async def get_condition_analytics(
    population_id: Optional[str] = Query(None),
    top_n: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get condition analytics across populations"""
    # For now, return mock data based on configured modules
    # In a real implementation, this would query FHIR resources

    if population_id:
        result = await db.execute(
            select(Population).where(Population.id == population_id)
        )
        population = result.scalar_one_or_none()
        if population:
            modules = population.config.get("modules", [])
        else:
            modules = []
    else:
        # Get all modules from all populations
        result = await db.execute(select(Population))
        populations = result.scalars().all()
        modules = []
        for pop in populations:
            modules.extend(pop.config.get("modules", []))

    # Count module occurrences
    module_counts = {}
    for module in modules:
        module_counts[module] = module_counts.get(module, 0) + 1

    return {
        "top_conditions": [
            {"name": name, "count": count}
            for name, count in sorted(module_counts.items(), key=lambda x: x[1], reverse=True)[:top_n]
        ]
    }


@router.get("/demographics")
async def get_demographics(
    population_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get demographic analytics"""
    if population_id:
        result = await db.execute(
            select(Population).where(Population.id == population_id)
        )
        populations = [result.scalar_one_or_none()]
    else:
        result = await db.execute(select(Population))
        populations = result.scalars().all()

    total_patients = 0
    age_ranges = []
    gender_counts = {"M": 0, "F": 0}

    for pop in populations:
        if pop and pop.status == PopulationStatus.COMPLETED:
            total_patients += pop.patient_count
            age_ranges.append(pop.config.get("age_range", [0, 100]))
            gender_dist = pop.config.get("gender_distribution", {"M": 0.5, "F": 0.5})
            gender_counts["M"] += pop.patient_count * gender_dist.get("M", 0.5)
            gender_counts["F"] += pop.patient_count * gender_dist.get("F", 0.5)

    return {
        "total_patients": total_patients,
        "gender_distribution": {
            "male": int(gender_counts["M"]),
            "female": int(gender_counts["F"])
        },
        "age_ranges": age_ranges
    }
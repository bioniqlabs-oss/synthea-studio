"""
Generation control endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.models import Population, GenerationJob
from app.models.population import PopulationStatus


router = APIRouter()


@router.post("/{population_id}/start")
async def start_generation(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Start generation for a population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")
    
    if population.status != PopulationStatus.PENDING:
        raise HTTPException(
            status_code=400, 
            detail=f"Population is {population.status.value}, cannot start generation"
        )
    
    # TODO: Start Celery task
    # task = generate_population.delay(population_id)
    
    # Update population status
    population.status = PopulationStatus.GENERATING
    
    # Create job record
    job = GenerationJob(
        population_id=population_id,
        # celery_task_id=task.id
    )
    
    db.add(job)
    await db.commit()
    
    return {
        "message": "Generation started",
        "population_id": population_id,
        "job_id": str(job.id)
    }


@router.post("/{population_id}/stop")
async def stop_generation(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Stop generation for a population"""
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")
    
    if population.status != PopulationStatus.GENERATING:
        raise HTTPException(
            status_code=400,
            detail=f"Population is {population.status.value}, not generating"
        )
    
    # TODO: Cancel Celery task
    
    population.status = PopulationStatus.FAILED
    await db.commit()
    
    return {"message": "Generation stopped", "population_id": population_id}


@router.websocket("/ws/{population_id}")
async def generation_progress(
    websocket: WebSocket,
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """WebSocket endpoint for real-time generation progress"""
    await websocket.accept()
    
    try:
        # Verify population exists
        result = await db.execute(
            select(Population).where(Population.id == population_id)
        )
        population = result.scalar_one_or_none()
        
        if not population:
            await websocket.send_text(json.dumps({
                "error": "Population not found"
            }))
            await websocket.close()
            return
        
        # TODO: Subscribe to Redis pubsub for progress updates
        # For now, send mock progress
        import asyncio
        for i in range(0, 101, 10):
            await websocket.send_text(json.dumps({
                "population_id": population_id,
                "progress": i,
                "message": f"Generating patients... {i}%"
            }))
            await asyncio.sleep(1)
        
    except Exception as e:
        await websocket.send_text(json.dumps({
            "error": str(e)
        }))
    finally:
        await websocket.close()
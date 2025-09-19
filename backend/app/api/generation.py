"""
Generation control endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.core.database import get_db
from app.core.config import settings
from app.models import Population, GenerationJob
from app.models.population import PopulationStatus
from app.workers.celery_app import celery_app


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
    
    # Start Celery task
    task = celery_app.send_task(
        'app.workers.generation_worker.generate_population',
        args=[population_id, population.patient_count, dict(population.config)]
    )
    
    # Update population status
    population.status = PopulationStatus.GENERATING
    
    # Create job record
    job = GenerationJob(
        population_id=population_id,
        celery_task_id=task.id
    )
    
    db.add(job)
    await db.commit()
    
    return {
        "message": "Generation started",
        "population_id": population_id,
        "job_id": str(job.id)
    }


@router.post("/{population_id}/import")
async def manual_import(
    population_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Manually trigger FHIR import for a completed population"""
    # Get population
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()

    if not population:
        raise HTTPException(status_code=404, detail="Population not found")

    if population.status != PopulationStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail=f"Population is {population.status.value}, can only import completed populations"
        )

    if not population.storage_path:
        raise HTTPException(
            status_code=400,
            detail="Population has no storage path"
        )

    # Import in background thread to avoid blocking
    import asyncio
    from app.workers.generation_worker import import_patients_to_fhir

    loop = asyncio.get_event_loop()

    # Run the import in a background thread
    import_result = await loop.run_in_executor(
        None,
        import_patients_to_fhir,
        population_id,
        population.storage_path
    )

    return {
        "message": "Import completed",
        "population_id": population_id,
        "storage_path": population.storage_path
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
    print(f"WebSocket accepted for population {population_id}")

    import aioredis
    import asyncio

    redis = None
    pubsub = None

    try:
        # Verify population exists
        result = await db.execute(
            select(Population).where(Population.id == population_id)
        )
        population = result.scalar_one_or_none()

        if not population:
            print(f"Population {population_id} not found")
            await websocket.send_text(json.dumps({
                "error": "Population not found"
            }))
            await websocket.close()
            return

        print(f"Connecting to Redis for population {population_id}")
        # Connect to Redis and subscribe to progress updates
        redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis.pubsub()

        # Subscribe to both progress and error channels
        await pubsub.subscribe(
            f"population:{population_id}:progress",
            f"population:{population_id}:error"
        )

        # Send initial status
        await websocket.send_text(json.dumps({
            "population_id": population_id,
            "status": population.status.value,
            "progress": 0,
            "message": "Connected to progress stream"
        }))

        # Listen for messages
        async for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    # Parse the message data
                    data = json.loads(message['data'])

                    # Check which channel the message came from
                    if 'error' in message['channel']:
                        # Send error and close
                        await websocket.send_text(json.dumps({
                            "population_id": population_id,
                            "error": data.get('error', 'Generation failed'),
                            "status": "FAILED"
                        }))
                        break
                    else:
                        # Send progress update
                        await websocket.send_text(json.dumps({
                            "population_id": population_id,
                            "progress": data.get('progress', 0),
                            "message": data.get('message', ''),
                            "status": "GENERATING"
                        }))

                        # Check if complete
                        if data.get('progress') == 100 and 'complete' in data.get('message', '').lower():
                            await websocket.send_text(json.dumps({
                                "population_id": population_id,
                                "progress": 100,
                                "message": "Generation complete!",
                                "status": "COMPLETED"
                            }))
                            break

                except json.JSONDecodeError:
                    # Skip malformed messages
                    continue

    except Exception as e:
        print(f"WebSocket exception for {population_id}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        try:
            await websocket.send_text(json.dumps({
                "error": str(e)
            }))
        except:
            pass  # WebSocket might already be closed
    finally:
        if pubsub:
            try:
                await pubsub.unsubscribe()
                await pubsub.close()
            except:
                pass
        if redis:
            try:
                await redis.close()
            except:
                pass
        try:
            await websocket.close()
        except:
            pass  # WebSocket might already be closed
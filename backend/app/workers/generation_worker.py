"""
Celery worker for asynchronous population generation
"""
import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

from celery import Task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import redis

from app.workers.celery_app import celery_app
from app.services.synthea_wrapper import SyntheaWrapper
from app.models.population import Population, PopulationStatus
from app.models.job import GenerationJob
from app.core.config import settings

logger = logging.getLogger(__name__)

# Create synchronous database connection for Celery
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Redis client for progress updates
redis_client = redis.from_url(settings.REDIS_URL)


class GenerationTask(Task):
    """Custom task class with progress tracking"""
    
    def __init__(self):
        super().__init__()
        self.synthea = None
    
    def __call__(self, *args, **kwargs):
        """Initialize Synthea wrapper on first call"""
        if self.synthea is None:
            self.synthea = SyntheaWrapper()
        return self.run(*args, **kwargs)


@celery_app.task(bind=True, base=GenerationTask)
def generate_population(
    self,
    population_id: str,
    size: int,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Celery task to generate a synthetic population
    
    Args:
        population_id: Unique identifier for the population
        size: Number of patients to generate
        config: Synthea configuration parameters
        
    Returns:
        Dictionary with generation results
    """
    logger.info(f"Starting generation task for population {population_id}")
    
    db = SessionLocal()
    job_id = None
    
    try:
        # Update population status
        population = db.query(Population).filter_by(id=population_id).first()
        if not population:
            raise ValueError(f"Population {population_id} not found")
        
        population.status = PopulationStatus.GENERATING
        
        # Create job record
        job = GenerationJob(
            population_id=population_id,
            celery_task_id=self.request.id
        )
        db.add(job)
        db.commit()
        job_id = job.id
        
        # Progress callback
        def update_progress(progress: int, message: str):
            # Update job progress
            job.progress = progress
            db.commit()
            
            # Publish to Redis for WebSocket
            redis_client.publish(
                f"population:{population_id}:progress",
                json.dumps({
                    "population_id": population_id,
                    "job_id": str(job_id),
                    "progress": progress,
                    "message": message,
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
            
            # Update Celery task state
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": progress,
                    "total": 100,
                    "status": message
                }
            )
        
        # Generate population using Synthea
        update_progress(0, "Initializing Synthea...")
        
        result = self.synthea.generate_population(
            population_id=population_id,
            size=size,
            config=config,
            progress_callback=update_progress
        )
        
        # Update population with results
        update_progress(90, "Finalizing population data...")
        
        population.status = PopulationStatus.COMPLETED
        population.patient_count = result["patient_count"]
        population.storage_path = result["output_path"]
        population.completed_at = datetime.utcnow()
        
        # Update job
        job.progress = 100
        job.completed_at = datetime.utcnow()
        job.logs = f"Successfully generated {size} patients"
        
        db.commit()
        
        update_progress(100, "Generation complete!")
        
        # Store result in Redis for quick access
        redis_client.setex(
            f"population:{population_id}:result",
            3600,  # Expire after 1 hour
            json.dumps(result)
        )
        
        logger.info(f"Successfully completed generation for {population_id}")
        
        return {
            "success": True,
            "population_id": population_id,
            "patient_count": result["patient_count"],
            "output_path": result["output_path"],
            "files": result["files"]
        }
        
    except Exception as e:
        logger.error(f"Generation failed for {population_id}: {str(e)}")
        
        # Update population status
        if db:
            population = db.query(Population).filter_by(id=population_id).first()
            if population:
                population.status = PopulationStatus.FAILED
            
            if job_id:
                job = db.query(GenerationJob).filter_by(id=job_id).first()
                if job:
                    job.error_message = str(e)
                    job.completed_at = datetime.utcnow()
            
            db.commit()
        
        # Publish error to Redis
        redis_client.publish(
            f"population:{population_id}:error",
            json.dumps({
                "population_id": population_id,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            })
        )
        
        raise
        
    finally:
        if db:
            db.close()


@celery_app.task
def cleanup_old_populations(days_old: int = 30) -> Dict[str, int]:
    """
    Periodic task to clean up old population data
    
    Args:
        days_old: Remove populations older than this many days
        
    Returns:
        Dictionary with cleanup statistics
    """
    from datetime import timedelta
    
    db = SessionLocal()
    
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Find old populations
        old_populations = db.query(Population).filter(
            Population.created_at < cutoff_date,
            Population.status == PopulationStatus.COMPLETED
        ).all()
        
        removed_count = 0
        removed_size = 0
        
        for population in old_populations:
            # Remove files
            if population.storage_path:
                storage_path = Path(population.storage_path)
                if storage_path.exists():
                    import shutil
                    shutil.rmtree(storage_path)
                    removed_size += sum(
                        f.stat().st_size for f in storage_path.rglob("*") if f.is_file()
                    )
            
            # Remove from database
            db.delete(population)
            removed_count += 1
        
        db.commit()
        
        logger.info(f"Cleaned up {removed_count} old populations, freed {removed_size} bytes")
        
        return {
            "removed_count": removed_count,
            "removed_size": removed_size
        }
        
    finally:
        db.close()
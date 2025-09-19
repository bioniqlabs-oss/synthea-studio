"""Population generation tasks"""

import logging
from datetime import datetime
from typing import Dict, Any

from celery import current_task
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.config import settings
from shared.models import Population, PopulationStatus, GenerationJob
from shared.utils import RedisPublisher, create_progress_callback

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="worker.generate_population")
def generate_population(
    self,
    population_id: str,
    size: int,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """Generate a synthetic population
    
    Args:
        population_id: Unique identifier for the population
        size: Number of patients to generate
        config: Generation configuration
    
    Returns:
        Dictionary with generation results
    """
    logger.info(f"Starting generation task for population {population_id}")
    
    # Get database session
    with self.db_manager.get_session() as db:
        try:
            # Get population record
            population = db.query(Population).filter_by(id=population_id).first()
            if not population:
                raise ValueError(f"Population {population_id} not found")
            
            # Update status
            population.status = PopulationStatus.GENERATING
            population.started_at = datetime.utcnow()
            
            # Create or update job record
            job = db.query(GenerationJob).filter_by(
                population_id=population_id,
                celery_task_id=self.request.id
            ).first()
            
            if not job:
                job = GenerationJob(
                    population_id=population_id,
                    celery_task_id=self.request.id,
                    status="GENERATING"
                )
                db.add(job)
            
            job.started_at = datetime.utcnow()
            job.status = "GENERATING"
            db.commit()
            
            # Create Redis publisher for progress updates
            redis_publisher = RedisPublisher(settings.REDIS_URL)
            
            # Create progress callback
            def update_progress(current: int, total: int, message: str):
                progress = int((current / total) * 100) if total > 0 else 0
                
                # Update database
                job.progress = progress
                job.progress_message = message
                population.progress = progress
                db.commit()
                
                # Publish to Redis
                redis_publisher.publish_progress(
                    population_id,
                    progress,
                    message,
                    str(job.id)
                )
                
                # Update Celery task state
                self.update_state(
                    state="PROGRESS",
                    meta={
                        "current": current,
                        "total": total,
                        "progress": progress,
                        "message": message
                    }
                )
            
            # Generate population using Synthea
            update_progress(0, 100, "Initializing Synthea...")
            
            result = self.synthea_wrapper.generate_population(
                population_id=population_id,
                size=size,
                config=config,
                progress_callback=lambda curr, total, msg: update_progress(
                    curr, total, msg
                )
            )
            
            # Update population with results
            update_progress(size, size, "Finalizing population data...")
            
            population.status = PopulationStatus.COMPLETED
            population.patient_count = result["patient_count"]
            population.storage_path = result["output_path"]
            population.completed_at = datetime.utcnow()
            
            # Update job
            job.progress = 100
            job.status = "COMPLETED"
            job.completed_at = datetime.utcnow()
            job.output_path = result["output_path"]
            job.logs = f"Successfully generated {result['patient_count']} patients"
            
            db.commit()
            
            # Trigger auto-import task
            from app.tasks.import_fhir import import_population_to_fhir
            import_population_to_fhir.delay(population_id, result["output_path"])
            
            # Publish completion
            redis_publisher.publish_complete(population_id, result)
            
            logger.info(f"Successfully completed generation for {population_id}")
            
            return {
                "success": True,
                "population_id": population_id,
                "patient_count": result["patient_count"],
                "output_path": result["output_path"],
                "files": result["files"]
            }
            
        except Exception as e:
            logger.error(f"Generation failed for {population_id}: {e}")
            
            # Update status
            if population:
                population.status = PopulationStatus.FAILED
                population.completed_at = datetime.utcnow()
            
            if job:
                job.status = "FAILED"
                job.error_message = str(e)
                job.completed_at = datetime.utcnow()
            
            db.commit()
            
            # Publish error
            if 'redis_publisher' in locals():
                redis_publisher.publish_error(population_id, str(e))
            
            raise
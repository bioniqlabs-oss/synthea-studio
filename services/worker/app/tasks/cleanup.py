"""Cleanup tasks for old populations and data"""

import logging
from datetime import datetime, timedelta
from pathlib import Path
import shutil

from celery import current_task
from sqlalchemy import and_

from app.celery_app import celery_app
from app.core.config import settings
from shared.models import Population, PopulationStatus, FHIRResource

logger = logging.getLogger(__name__)


@celery_app.task(name="worker.cleanup_old_populations")
def cleanup_old_populations(days_old: int = None) -> Dict[str, Any]:
    """Clean up old population data
    
    Args:
        days_old: Number of days to keep populations (default from config)
    
    Returns:
        Cleanup statistics
    """
    if days_old is None:
        days_old = settings.CLEANUP_AGE_DAYS
    
    logger.info(f"Starting cleanup of populations older than {days_old} days")
    
    with celery_app.db_manager.get_session() as db:
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)
        
        # Find old completed populations
        old_populations = db.query(Population).filter(
            and_(
                Population.created_at < cutoff_date,
                Population.status == PopulationStatus.COMPLETED
            )
        ).all()
        
        removed_count = 0
        removed_size = 0
        removed_resources = 0
        
        for population in old_populations:
            try:
                # Remove FHIR resources from database
                resource_count = db.query(FHIRResource).filter_by(
                    population_id=population.id
                ).delete()
                removed_resources += resource_count
                
                # Remove files from storage
                if population.storage_path:
                    storage_path = Path(population.storage_path)
                    if storage_path.exists():
                        # Calculate size before deletion
                        size = sum(
                            f.stat().st_size 
                            for f in storage_path.rglob("*") 
                            if f.is_file()
                        )
                        removed_size += size
                        
                        # Remove directory
                        shutil.rmtree(storage_path)
                        logger.info(f"Removed storage for population {population.id}")
                
                # Remove population record
                db.delete(population)
                removed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to cleanup population {population.id}: {e}")
                continue
        
        db.commit()
        
        logger.info(
            f"Cleanup complete: removed {removed_count} populations, "
            f"{removed_resources} resources, freed {removed_size / (1024**2):.2f} MB"
        )
        
        return {
            "removed_populations": removed_count,
            "removed_resources": removed_resources,
            "removed_size_mb": removed_size / (1024**2)
        }


@celery_app.task(name="worker.cleanup_failed_populations")
def cleanup_failed_populations() -> Dict[str, Any]:
    """Clean up failed population attempts"""
    logger.info("Cleaning up failed populations")
    
    with celery_app.db_manager.get_session() as db:
        # Find failed populations older than 7 days
        cutoff_date = datetime.utcnow() - timedelta(days=7)
        
        failed_populations = db.query(Population).filter(
            and_(
                Population.status == PopulationStatus.FAILED,
                Population.created_at < cutoff_date
            )
        ).all()
        
        removed_count = 0
        
        for population in failed_populations:
            try:
                # Remove any partial data
                if population.storage_path:
                    storage_path = Path(population.storage_path)
                    if storage_path.exists():
                        shutil.rmtree(storage_path)
                
                # Remove any imported resources
                db.query(FHIRResource).filter_by(
                    population_id=population.id
                ).delete()
                
                # Remove population
                db.delete(population)
                removed_count += 1
                
            except Exception as e:
                logger.error(f"Failed to cleanup failed population {population.id}: {e}")
                continue
        
        db.commit()
        
        logger.info(f"Removed {removed_count} failed populations")
        
        return {"removed_failed": removed_count}


@celery_app.task(name="worker.cleanup_orphaned_resources")
def cleanup_orphaned_resources() -> Dict[str, Any]:
    """Clean up FHIR resources without associated populations"""
    logger.info("Cleaning up orphaned FHIR resources")
    
    with celery_app.db_manager.get_session() as db:
        # Find resources without valid population
        orphaned = db.execute(
            """
            DELETE FROM fhir_resources 
            WHERE population_id NOT IN (
                SELECT id FROM populations
            )
            RETURNING id
            """
        )
        
        removed_count = len(orphaned.fetchall())
        db.commit()
        
        logger.info(f"Removed {removed_count} orphaned resources")
        
        return {"removed_orphaned": removed_count}


from typing import Dict, Any
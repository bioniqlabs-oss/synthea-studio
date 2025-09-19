"""FHIR import tasks - Direct database access instead of HTTP"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, List
from pathlib import Path

from celery import current_task
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.celery_app import celery_app
from app.core.config import settings
from shared.models import (
    Population, 
    FHIRResource, 
    FHIRBundle,
    PopulationStatus
)
from shared.utils import (
    load_bundles, 
    extract_resources,
    extract_patient_id,
    count_resources_by_type,
    RedisPublisher
)

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="worker.import_population_to_fhir")
def import_population_to_fhir(
    self,
    population_id: str,
    output_path: str
) -> Dict[str, Any]:
    """Import generated FHIR bundles directly to database
    
    This is the KEY IMPROVEMENT: Direct database writes instead of HTTP calls
    
    Args:
        population_id: Population ID
        output_path: Path to generated FHIR files
    
    Returns:
        Import statistics
    """
    logger.info(f"Starting FHIR import for population {population_id}")
    
    # Create Redis publisher
    redis_publisher = RedisPublisher(settings.REDIS_URL)
    
    with self.db_manager.get_session() as db:
        try:
            # Update task state
            self.update_state(
                state="PROGRESS",
                meta={"message": "Loading FHIR bundles..."}
            )
            
            # Load all bundles
            bundles = load_bundles(output_path)
            logger.info(f"Found {len(bundles)} FHIR bundles to import")
            
            if not bundles:
                logger.warning(f"No FHIR bundles found at {output_path}")
                return {
                    "success": False,
                    "population_id": population_id,
                    "message": "No FHIR bundles found"
                }
            
            # Import statistics
            total_resources = 0
            imported_resources = 0
            failed_resources = 0
            resource_counts = {}
            
            # Process bundles in batches
            batch_size = settings.IMPORT_BATCH_SIZE
            resources_to_insert = []
            
            for bundle_idx, bundle in enumerate(bundles):
                # Update progress
                progress = int((bundle_idx / len(bundles)) * 100)
                redis_publisher.publish_progress(
                    population_id,
                    progress,
                    f"Processing bundle {bundle_idx + 1}/{len(bundles)}..."
                )
                
                # Create bundle record
                fhir_bundle = FHIRBundle(
                    bundle_type=bundle.get("type", "collection"),
                    bundle=bundle,
                    population_id=population_id,
                    status="processing"
                )
                db.add(fhir_bundle)
                
                # Extract and process resources
                for resource in extract_resources(bundle):
                    total_resources += 1
                    
                    try:
                        # Create FHIR resource
                        fhir_resource = FHIRResource.from_fhir(
                            resource,
                            population_id
                        )
                        resources_to_insert.append(fhir_resource)
                        
                        # Track resource type
                        resource_type = resource.get("resourceType")
                        resource_counts[resource_type] = resource_counts.get(resource_type, 0) + 1
                        
                        # Batch insert
                        if len(resources_to_insert) >= batch_size:
                            db.bulk_save_objects(resources_to_insert)
                            db.commit()
                            imported_resources += len(resources_to_insert)
                            resources_to_insert = []
                            
                            # Update progress
                            redis_publisher.publish_progress(
                                population_id,
                                progress,
                                f"Imported {imported_resources}/{total_resources} resources..."
                            )
                        
                    except Exception as e:
                        logger.error(f"Failed to import resource: {e}")
                        failed_resources += 1
                
                # Update bundle status
                fhir_bundle.status = "completed"
                fhir_bundle.processed_at = datetime.utcnow()
                fhir_bundle.resource_count = len(list(extract_resources(bundle)))
            
            # Insert remaining resources
            if resources_to_insert:
                db.bulk_save_objects(resources_to_insert)
                imported_resources += len(resources_to_insert)
            
            # Update population statistics
            population = db.query(Population).filter_by(id=population_id).first()
            if population:
                population.total_resources = imported_resources
                population.total_conditions = resource_counts.get("Condition", 0)
                population.total_observations = resource_counts.get("Observation", 0)
                population.total_procedures = resource_counts.get("Procedure", 0)
                population.total_medications = resource_counts.get("MedicationRequest", 0)
                population.total_encounters = resource_counts.get("Encounter", 0)
            
            db.commit()
            
            # Final progress update
            redis_publisher.publish_progress(
                population_id,
                100,
                f"Import complete: {imported_resources} resources imported"
            )
            
            logger.info(
                f"Import complete for population {population_id}: "
                f"{imported_resources}/{total_resources} resources imported, "
                f"{failed_resources} failed"
            )
            
            return {
                "success": True,
                "population_id": population_id,
                "total_resources": total_resources,
                "imported_resources": imported_resources,
                "failed_resources": failed_resources,
                "resource_counts": resource_counts
            }
            
        except Exception as e:
            logger.error(f"Failed to import FHIR data for {population_id}: {e}")
            
            # Update population status
            population = db.query(Population).filter_by(id=population_id).first()
            if population:
                population.status = PopulationStatus.FAILED
            db.commit()
            
            # Publish error
            redis_publisher.publish_error(population_id, str(e))
            
            raise


@celery_app.task(bind=True, name="worker.reimport_population")
def reimport_population(self, population_id: str) -> Dict[str, Any]:
    """Re-import an existing population's FHIR data
    
    Useful for recovering from import failures or updating data.
    """
    logger.info(f"Re-importing FHIR data for population {population_id}")
    
    with self.db_manager.get_session() as db:
        # Get population
        population = db.query(Population).filter_by(id=population_id).first()
        if not population:
            raise ValueError(f"Population {population_id} not found")
        
        if not population.storage_path:
            raise ValueError(f"Population {population_id} has no storage path")
        
        # Clear existing resources for this population
        deleted = db.query(FHIRResource).filter_by(
            population_id=population_id
        ).delete()
        db.commit()
        
        logger.info(f"Cleared {deleted} existing resources for {population_id}")
    
    # Run import
    return import_population_to_fhir.apply(
        args=[population_id, population.storage_path]
    ).get()


@celery_app.task(name="worker.get_import_stats")
def get_import_stats(population_id: str) -> Dict[str, Any]:
    """Get import statistics for a population"""
    with celery_app.db_manager.get_session() as db:
        # Count resources by type
        stats = {}
        
        for resource_type in ["Patient", "Condition", "Observation", 
                             "Procedure", "MedicationRequest", "Encounter"]:
            count = db.query(func.count(FHIRResource.id)).filter(
                FHIRResource.population_id == population_id,
                FHIRResource.resource_type == resource_type
            ).scalar()
            stats[resource_type] = count
        
        # Get total
        total = db.query(func.count(FHIRResource.id)).filter(
            FHIRResource.population_id == population_id
        ).scalar()
        
        stats["total"] = total
        
        return {
            "population_id": population_id,
            "statistics": stats
        }
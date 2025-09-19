"""Celery application configuration"""

import logging
from celery import Celery, Task
from celery.signals import worker_ready, worker_shutdown

from app.core.config import settings
from app.core.database import DatabaseManager

logger = logging.getLogger(__name__)

# Create Celery app
celery_app = Celery(
    "synthea_worker",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.generation", "app.tasks.import_fhir", "app.tasks.cleanup"]
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    task_soft_time_limit=3300,  # 55 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    result_expires=3600,
)


class DatabaseTask(Task):
    """Base task with database connection"""
    _db_manager = None
    _synthea_wrapper = None

    @property
    def db_manager(self) -> DatabaseManager:
        """Get or create database manager"""
        if self._db_manager is None:
            self._db_manager = DatabaseManager(settings.DATABASE_URL)
        return self._db_manager

    @property
    def synthea_wrapper(self):
        """Get or create Synthea wrapper"""
        if self._synthea_wrapper is None:
            from app.core.synthea import SyntheaWrapper
            self._synthea_wrapper = SyntheaWrapper()
        return self._synthea_wrapper


# Set base task class
celery_app.Task = DatabaseTask


@worker_ready.connect
def on_worker_ready(**kwargs):
    """Initialize worker on startup"""
    logger.info("Worker started and ready")
    
    # Initialize database
    try:
        db_manager = DatabaseManager(settings.DATABASE_URL)
        db_manager.create_tables()
        logger.info("Database tables verified")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")


@worker_shutdown.connect
def on_worker_shutdown(**kwargs):
    """Cleanup on worker shutdown"""
    logger.info("Worker shutting down")
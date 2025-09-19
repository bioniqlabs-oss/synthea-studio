"""Worker Service Configuration"""

from shared.config import SharedConfig


class WorkerConfig(SharedConfig):
    """Worker service specific configuration"""
    
    # Service identification
    SERVICE_NAME: str = "worker-service"
    
    # Worker settings
    WORKER_CONCURRENCY: int = 4
    WORKER_LOG_LEVEL: str = "INFO"
    WORKER_TASK_TRACK_STARTED: bool = True
    
    # Generation settings
    MAX_POPULATION_SIZE: int = 10000
    GENERATION_TIMEOUT: int = 3600  # 1 hour
    BATCH_SIZE: int = 100  # Process patients in batches
    
    # Import settings
    IMPORT_BATCH_SIZE: int = 50  # Import resources in batches
    IMPORT_RETRY_ATTEMPTS: int = 3
    IMPORT_RETRY_DELAY: int = 5  # seconds
    
    # Cleanup settings
    CLEANUP_AGE_DAYS: int = 30
    CLEANUP_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = WorkerConfig()
"""Shared configuration for all services"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class SharedConfig(BaseSettings):
    """Configuration shared across all services"""
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost/synthea"
    DATABASE_POOL_SIZE: int = 5
    DATABASE_MAX_OVERFLOW: int = 10
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Service URLs (for inter-service communication)
    SYNTHEA_SERVICE_URL: str = "http://synthea-service:8000"
    FHIR_SERVICE_URL: str = "http://fhir-service:8001"
    WORKER_SERVICE_URL: str = "http://worker-service:8002"
    
    # Storage
    STORAGE_PATH: str = "/tmp/synthea-output"
    
    # Synthea
    SYNTHEA_JAR_PATH: str = "/app/synthea/synthea-with-dependencies.jar"
    SYNTHEA_DEFAULT_STATE: str = "Massachusetts"
    
    # FHIR
    FHIR_VERSION: str = "R4"
    FHIR_MAX_PAGE_SIZE: int = 100
    FHIR_DEFAULT_PAGE_SIZE: int = 20
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    
    class Config:
        env_file = ".env"
        case_sensitive = True


def get_shared_config() -> SharedConfig:
    """Get shared configuration instance"""
    return SharedConfig()
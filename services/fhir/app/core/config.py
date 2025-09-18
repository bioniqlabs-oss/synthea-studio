"""FHIR Service Configuration"""

from typing import List
from pydantic_settings import BaseSettings

from shared.config import SharedConfig


class FHIRServiceConfig(SharedConfig):
    """FHIR Service specific configuration"""
    
    # Service identification
    SERVICE_NAME: str = "fhir-service"
    SERVICE_URL: str = "http://fhir-service:8001"
    SERVICE_PORT: int = 8001
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:80",
        "http://localhost:3000",
        "http://localhost:3080",
        "http://localhost:8000",
        "http://gateway",
    ]
    
    # FHIR specific settings
    FHIR_BASE_URL: str = "http://localhost:8001/"
    FHIR_VALIDATE_RESOURCES: bool = True
    FHIR_STRICT_MODE: bool = False
    
    # Cache settings
    CACHE_TTL: int = 300  # 5 minutes
    CACHE_ENABLED: bool = True
    
    # Search settings
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100
    
    # Performance settings
    CONNECTION_POOL_SIZE: int = 20
    CONNECTION_MAX_OVERFLOW: int = 10
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = FHIRServiceConfig()
"""Gateway Service Configuration"""

from typing import List
from pydantic_settings import BaseSettings


class GatewayConfig(BaseSettings):
    """Gateway service configuration"""

    # Service identification
    SERVICE_NAME: str = "api-gateway"
    SERVICE_PORT: int = 8000

    # Service URLs
    FHIR_SERVICE_URL: str = "http://fhir-service:8002"
    WORKER_SERVICE_URL: str = "http://worker-service:8003"

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@postgres:5432/synthea_studio"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    CELERY_BROKER_URL: str = "redis://redis:6379/1"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Authentication
    AUTH_ENABLED: bool = False
    JWT_SECRET_KEY: str = "your-secret-key-change-this"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_CALLS: int = 100
    RATE_LIMIT_PERIOD: int = 60  # seconds

    # Caching
    CACHE_ENABLED: bool = True
    CACHE_TTL: int = 300  # seconds

    # Service discovery
    SERVICE_DISCOVERY_ENABLED: bool = True
    SERVICE_HEALTH_CHECK_INTERVAL: int = 30  # seconds
    SERVICE_HEALTH_CHECK_TIMEOUT: int = 5  # seconds

    # Request timeouts
    REQUEST_TIMEOUT: int = 30  # seconds
    LONG_REQUEST_TIMEOUT: int = 300  # seconds (for generation tasks)

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = GatewayConfig()
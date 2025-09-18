"""
Application configuration
"""
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Settings
    PORT: int = 8001
    HOST: str = "0.0.0.0"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/synthea_studio"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:5173",
        "http://localhost:3080",
        "https://synthea-studio.github.io"
    ]
    
    # Storage
    STORAGE_BACKEND: str = "local"  # local, s3, minio, azure
    STORAGE_PATH: str = "/var/lib/synthea-studio/storage"
    
    # S3/MinIO settings
    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "synthea-populations"
    S3_REGION: str = "us-east-1"
    
    # Synthea
    SYNTHEA_JAR_PATH: str = "/app/synthea/synthea-with-dependencies.jar"
    SYNTHEA_OUTPUT_PATH: str = "/tmp/synthea-output"
    SYNTHEA_DEFAULT_STATE: str = "Massachusetts"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
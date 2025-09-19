"""API Gateway main application"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
import logging

from app.core.config import settings
from app.core.service_registry import ServiceRegistry
from app.middleware.auth import AuthMiddleware
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import (
    populations,
    fhir,
    health,
    websocket,
    analytics
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting API Gateway")

    # Initialize service registry
    service_registry = ServiceRegistry()
    await service_registry.initialize()
    app.state.services = service_registry

    # Register services
    await service_registry.register_service(
        "fhir",
        settings.FHIR_SERVICE_URL,
        health_path="/health"
    )
    await service_registry.register_service(
        "worker",
        settings.WORKER_SERVICE_URL,
        health_path="/health"
    )

    logger.info("API Gateway started successfully")

    yield

    # Shutdown
    logger.info("Shutting down API Gateway")
    await service_registry.shutdown()


# Create FastAPI application
app = FastAPI(
    title="Synthea Studio API Gateway",
    description="Unified API Gateway for Synthea Studio services",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(RateLimitMiddleware, calls=settings.RATE_LIMIT_CALLS, period=settings.RATE_LIMIT_PERIOD)
app.add_middleware(LoggingMiddleware)
if settings.AUTH_ENABLED:
    app.add_middleware(AuthMiddleware, secret_key=settings.JWT_SECRET_KEY)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(populations.router, prefix="/api/populations", tags=["populations"])
app.include_router(fhir.router, prefix="/api/fhir", tags=["fhir"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(websocket.router, prefix="/ws", tags=["websocket"])

# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "path": str(request.url.path)
        }
    )
"""
Synthea Studio Backend API
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import populations, generation, export, fhir, analytics
from app.core.config import settings
from app.core.database import init_db, get_db
from app.models.population import PopulationStatus


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources"""
    # Startup
    await init_db()
    print(f"Synthea Studio API started on port {settings.PORT}")
    
    yield
    
    # Shutdown
    print("Shutting down Synthea Studio API")


app = FastAPI(
    title="Synthea Studio API",
    description="Configuration UI for Synthea synthetic patient generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
cors_origins = settings.CORS_ORIGINS
if isinstance(cors_origins, str):
    cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(populations.router, prefix="/api/populations", tags=["populations"])
app.include_router(generation.router, prefix="/api/generation", tags=["generation"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(fhir.router, prefix="/fhir", tags=["fhir"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Synthea Studio API",
        "version": "1.0.0",
        "status": "operational"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return JSONResponse(
        status_code=200,
        content={"status": "healthy"}
    )


@app.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    """Readiness check - verifies all services are ready"""
    try:
        # Check database connection
        await db.execute(select(1))

        # Check Redis connection
        import redis.asyncio as aioredis
        redis_client = await aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()

        return JSONResponse(
            status_code=200,
            content={
                "status": "ready",
                "services": {
                    "database": "ready",
                    "redis": "ready"
                }
            }
        )
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={
                "status": "not ready",
                "error": str(e)
            }
        )


@app.get("/health/services")
async def health_services(db: AsyncSession = Depends(get_db)):
    """Service status endpoint"""
    services = {}

    # Check database
    try:
        await db.execute(select(1))
        services["database"] = {"status": "healthy", "type": "PostgreSQL"}
    except Exception as e:
        services["database"] = {"status": "unhealthy", "error": str(e)}

    # Check Redis
    try:
        import redis.asyncio as aioredis
        redis_client = await aioredis.from_url(settings.REDIS_URL)
        await redis_client.ping()
        await redis_client.close()
        services["redis"] = {"status": "healthy", "type": "Redis"}
    except Exception as e:
        services["redis"] = {"status": "unhealthy", "error": str(e)}

    # Check Celery
    try:
        from app.workers.celery_app import celery_app
        i = celery_app.control.inspect()
        stats = i.stats()
        if stats:
            services["celery"] = {"status": "healthy", "workers": len(stats)}
        else:
            services["celery"] = {"status": "unhealthy", "workers": 0}
    except Exception as e:
        services["celery"] = {"status": "unhealthy", "error": str(e)}

    return JSONResponse(
        status_code=200,
        content={
            "services": services,
            "overall_health": all(s.get("status") == "healthy" for s in services.values())
        }
    )


@app.get("/health/metrics")
async def health_metrics(db: AsyncSession = Depends(get_db)):
    """System metrics endpoint"""
    from sqlalchemy import select, func
    from app.models import Population, GenerationJob

    # Get population metrics
    total_populations = await db.scalar(select(func.count(Population.id)))
    completed_populations = await db.scalar(
        select(func.count(Population.id)).where(
            Population.status == PopulationStatus.COMPLETED
        )
    )

    # Get job metrics
    total_jobs = await db.scalar(select(func.count(GenerationJob.id)))

    # Get patient count
    total_patients = await db.scalar(
        select(func.sum(Population.patient_count)).where(
            Population.status == PopulationStatus.COMPLETED
        )
    ) or 0

    return JSONResponse(
        status_code=200,
        content={
            "populations": {
                "total": total_populations,
                "completed": completed_populations,
                "pending": await db.scalar(
                    select(func.count(Population.id)).where(
                        Population.status == PopulationStatus.PENDING
                    )
                ),
                "generating": await db.scalar(
                    select(func.count(Population.id)).where(
                        Population.status == PopulationStatus.GENERATING
                    )
                ),
                "failed": await db.scalar(
                    select(func.count(Population.id)).where(
                        Population.status == PopulationStatus.FAILED
                    )
                )
            },
            "jobs": {
                "total": total_jobs
            },
            "patients": {
                "total_generated": total_patients
            }
        }
    )
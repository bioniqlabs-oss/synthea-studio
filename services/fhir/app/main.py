"""FHIR Service - Standalone FHIR R4 Server"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import patient, bundle, condition, observation, procedure, medication, encounter
from app.core.config import settings
from app.core.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting FHIR Service...")
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down FHIR Service...")


app = FastAPI(
    title="Synthea Studio FHIR Service",
    description="FHIR R4 compliant server for synthetic health data",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "fhir"}


@app.get("/metadata")
async def capability_statement():
    """Return FHIR server capability statement"""
    return {
        "resourceType": "CapabilityStatement",
        "status": "active",
        "date": "2024-01-01T00:00:00Z",
        "kind": "instance",
        "software": {
            "name": "Synthea Studio FHIR Server",
            "version": "1.0.0"
        },
        "implementation": {
            "description": "Synthea Studio FHIR R4 Server",
            "url": settings.SERVICE_URL
        },
        "fhirVersion": "4.0.1",
        "format": ["json"],
        "rest": [{
            "mode": "server",
            "resource": [
                {
                    "type": "Patient",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"},
                        {"code": "update"},
                        {"code": "delete"}
                    ],
                    "searchParam": [
                        {"name": "name", "type": "string"},
                        {"name": "birthdate", "type": "date"},
                        {"name": "gender", "type": "token"},
                        {"name": "identifier", "type": "token"}
                    ]
                },
                {
                    "type": "Condition",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "code", "type": "token"},
                        {"name": "onset-date", "type": "date"}
                    ]
                },
                {
                    "type": "Observation",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "code", "type": "token"},
                        {"name": "date", "type": "date"},
                        {"name": "category", "type": "token"}
                    ]
                },
                {
                    "type": "Procedure",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "code", "type": "token"},
                        {"name": "date", "type": "date"}
                    ]
                },
                {
                    "type": "MedicationRequest",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "medication", "type": "reference"},
                        {"name": "status", "type": "token"}
                    ]
                },
                {
                    "type": "Encounter",
                    "interaction": [
                        {"code": "read"},
                        {"code": "search-type"},
                        {"code": "create"}
                    ],
                    "searchParam": [
                        {"name": "patient", "type": "reference"},
                        {"name": "type", "type": "token"},
                        {"name": "date", "type": "date"}
                    ]
                }
            ],
            "interaction": [
                {"code": "transaction"},
                {"code": "batch"},
                {"code": "search-system"}
            ]
        }]
    }


# Include routers
app.include_router(bundle.router, tags=["Bundle"])
app.include_router(patient.router, prefix="/Patient", tags=["Patient"])
app.include_router(condition.router, prefix="/Condition", tags=["Condition"])
app.include_router(observation.router, prefix="/Observation", tags=["Observation"])
app.include_router(procedure.router, prefix="/Procedure", tags=["Procedure"])
app.include_router(medication.router, prefix="/MedicationRequest", tags=["MedicationRequest"])
app.include_router(encounter.router, prefix="/Encounter", tags=["Encounter"])


@app.exception_handler(404)
async def not_found_handler(request, exc):
    """FHIR-compliant 404 response"""
    return JSONResponse(
        status_code=404,
        content={
            "resourceType": "OperationOutcome",
            "issue": [{
                "severity": "error",
                "code": "not-found",
                "details": {"text": "Resource not found"}
            }]
        }
    )


@app.exception_handler(400)
async def bad_request_handler(request, exc):
    """FHIR-compliant 400 response"""
    return JSONResponse(
        status_code=400,
        content={
            "resourceType": "OperationOutcome",
            "issue": [{
                "severity": "error",
                "code": "invalid",
                "details": {"text": str(exc.detail) if hasattr(exc, 'detail') else "Bad request"}
            }]
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
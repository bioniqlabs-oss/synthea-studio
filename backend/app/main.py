"""
Synthea Studio Backend API
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import populations, generation, export, fhir
from app.core.config import settings
from app.core.database import init_db


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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(populations.router, prefix="/api/populations", tags=["populations"])
app.include_router(generation.router, prefix="/api/generation", tags=["generation"])
app.include_router(export.router, prefix="/api/export", tags=["export"])
app.include_router(fhir.router, prefix="/fhir", tags=["fhir"])


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
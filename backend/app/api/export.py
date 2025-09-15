"""
Export endpoints for populations
"""
import os
import zipfile
import json
from pathlib import Path
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models import Population

router = APIRouter()

# Base storage path - should match where Synthea outputs data
SYNTHEA_OUTPUT_PATH = os.getenv("SYNTHEA_OUTPUT_PATH", "/tmp/synthea-output")
STORAGE_PATH = os.getenv("STORAGE_PATH", "/var/lib/synthea-studio/storage")

@router.get("/{population_id}")
async def export_population(
    population_id: str,
    format: Literal["fhir", "csv", "ccda", "ndjson"] = "fhir",
    db: AsyncSession = Depends(get_db)
):
    """Export population data in specified format"""
    
    # Get population from database
    result = await db.execute(
        select(Population).where(Population.id == population_id)
    )
    population = result.scalar_one_or_none()
    
    if not population:
        raise HTTPException(status_code=404, detail="Population not found")
    
    if population.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Population generation not completed")
    
    # Determine the source directory based on format
    format_dirs = {
        "fhir": "fhir",
        "csv": "csv", 
        "ccda": "ccda",
        "ndjson": "fhir"  # NDJSON uses FHIR data
    }
    
    format_dir = format_dirs.get(format, "fhir")
    
    # Check multiple possible locations for the data
    possible_paths = [
        Path(SYNTHEA_OUTPUT_PATH) / population_id / format_dir,
        Path(SYNTHEA_OUTPUT_PATH) / format_dir,
        Path(STORAGE_PATH) / population_id / format_dir,
        Path(STORAGE_PATH) / format_dir,
    ]
    
    data_path = None
    for path in possible_paths:
        if path.exists() and path.is_dir():
            data_path = path
            break
    
    if not data_path or not data_path.exists():
        # Try to find any data for this population
        for base_path in [Path(SYNTHEA_OUTPUT_PATH), Path(STORAGE_PATH)]:
            if (base_path / population_id).exists():
                available_formats = [d.name for d in (base_path / population_id).iterdir() if d.is_dir()]
                raise HTTPException(
                    status_code=404, 
                    detail=f"Format '{format}' not available. Available formats: {', '.join(available_formats)}"
                )
        
        raise HTTPException(
            status_code=404, 
            detail=f"No data found for population {population_id}"
        )
    
    # Create a zip file with all the data
    import io
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for file_path in data_path.rglob('*'):
            if file_path.is_file():
                # Add file to zip with relative path
                arcname = file_path.relative_to(data_path.parent)
                zip_file.write(file_path, arcname=str(arcname))
    
    # Reset buffer position
    zip_buffer.seek(0)
    
    # Return the zip file
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename={population_id}_{format}.zip"
        }
    )

@router.get("/{population_id}/download")
async def download_population(
    population_id: str,
    format: Literal["fhir", "csv", "ccda", "ndjson"] = "fhir",
    db: AsyncSession = Depends(get_db)
):
    """Download population data (alias for export)"""
    return await export_population(population_id, format, db)
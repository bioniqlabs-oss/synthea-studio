"""FHIR Bundle endpoints"""

from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.fhir_store import FHIRStore
from shared.schemas import FHIRBundle

router = APIRouter()


@router.post("/")
async def process_bundle(
    bundle: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Process a FHIR Bundle transaction or batch
    
    This is the main endpoint for bulk imports from Synthea.
    """
    # Validate bundle structure
    if bundle.get("resourceType") != "Bundle":
        raise HTTPException(
            status_code=400,
            detail="Not a valid Bundle resource"
        )
    
    bundle_type = bundle.get("type")
    if bundle_type not in ["transaction", "batch", "collection"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bundle type '{bundle_type}' not supported. Use 'transaction', 'batch', or 'collection'"
        )
    
    # Process bundle
    store = FHIRStore(db)
    
    try:
        # Get population_id from custom header if present (for tracking)
        # This would be set by the worker service during auto-import
        population_id = None  # Could extract from headers if needed
        
        result = await store.process_bundle(bundle, population_id)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Failed to process bundle: {str(e)}"
        )


@router.get("/")
async def search_bundles(
    _count: int = 20,
    _offset: int = 0,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Search for processed bundles"""
    # This could return a list of processed bundles if needed
    # For now, return empty bundle
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": 0,
        "entry": []
    }
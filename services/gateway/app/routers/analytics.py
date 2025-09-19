"""Analytics router"""

from fastapi import APIRouter, Request, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(request: Request) -> Dict[str, Any]:
    """Get overall system analytics"""
    registry = request.app.state.services

    # Get analytics from FHIR service
    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/overview"
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/populations/{population_id}")
async def get_population_analytics(
    request: Request,
    population_id: str
) -> Dict[str, Any]:
    """Get analytics for specific population"""
    registry = request.app.state.services

    response = await registry.call_service(
        "fhir",
        "GET",
        f"/api/analytics/populations/{population_id}"
    )

    if response.status_code == 404:
        raise HTTPException(404, "Population not found")
    elif response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/conditions")
async def get_condition_analytics(
    request: Request,
    population_id: Optional[str] = Query(None),
    top_n: int = Query(10, le=100)
) -> Dict[str, Any]:
    """Get condition prevalence analytics"""
    registry = request.app.state.services

    params = {"top_n": top_n}
    if population_id:
        params["population_id"] = population_id

    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/conditions",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/demographics")
async def get_demographic_analytics(
    request: Request,
    population_id: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Get demographic distribution analytics"""
    registry = request.app.state.services

    params = {}
    if population_id:
        params["population_id"] = population_id

    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/demographics",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/utilization")
async def get_utilization_analytics(
    request: Request,
    population_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None)
) -> Dict[str, Any]:
    """Get healthcare utilization analytics"""
    registry = request.app.state.services

    params = {}
    if population_id:
        params["population_id"] = population_id
    if start_date:
        params["start_date"] = start_date.isoformat()
    if end_date:
        params["end_date"] = end_date.isoformat()

    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/utilization",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/trends")
async def get_trend_analytics(
    request: Request,
    metric: str = Query(..., description="Metric to analyze"),
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    days: int = Query(30, le=365)
) -> Dict[str, Any]:
    """Get trend analytics for various metrics"""
    registry = request.app.state.services

    params = {
        "metric": metric,
        "period": period,
        "days": days
    }

    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/trends",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    return response.json()


@router.get("/export")
async def export_analytics(
    request: Request,
    population_id: Optional[str] = Query(None),
    format: str = Query("json", regex="^(json|csv|excel)$")
) -> Any:
    """Export analytics data"""
    registry = request.app.state.services

    params = {"format": format}
    if population_id:
        params["population_id"] = population_id

    response = await registry.call_service(
        "fhir",
        "GET",
        "/api/analytics/export",
        params=params
    )

    if response.status_code != 200:
        raise HTTPException(response.status_code, response.text)

    # Return appropriate response based on format
    if format == "json":
        return response.json()
    else:
        # For CSV/Excel, return raw content
        return response.content
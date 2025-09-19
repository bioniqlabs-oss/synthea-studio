"""Health check endpoints"""

from fastapi import APIRouter, Request
from typing import Dict, Any

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check"""
    return {"status": "healthy", "service": "api-gateway"}


@router.get("/ready")
async def readiness_check(request: Request):
    """Readiness check including dependent services"""
    services_status = {}
    all_healthy = True

    # Check registered services
    if hasattr(request.app.state, "services"):
        registry = request.app.state.services
        for name, service in registry.get_all_services().items():
            services_status[name] = {
                "status": service.status,
                "url": service.url,
                "last_check": service.last_check.isoformat() if service.last_check else None
            }
            if not service.is_healthy():
                all_healthy = False

    return {
        "status": "ready" if all_healthy else "degraded",
        "services": services_status
    }


@router.get("/live")
async def liveness_check():
    """Liveness check"""
    return {"status": "alive"}


@router.get("/services")
async def list_services(request: Request) -> Dict[str, Any]:
    """List all registered services"""
    if not hasattr(request.app.state, "services"):
        return {"services": {}}

    registry = request.app.state.services
    services = {}

    for name, service in registry.get_all_services().items():
        services[name] = service.to_dict()

    return {"services": services}


@router.get("/metrics")
async def get_metrics(request: Request) -> Dict[str, Any]:
    """Get service metrics"""
    # This would integrate with Prometheus or similar
    return {
        "requests_total": 0,
        "requests_per_second": 0,
        "average_latency_ms": 0,
        "error_rate": 0,
        "services_healthy": len(request.app.state.services.get_healthy_services())
        if hasattr(request.app.state, "services") else 0
    }
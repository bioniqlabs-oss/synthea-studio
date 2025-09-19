"""Service Registry for dynamic service discovery"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
from enum import Enum

import httpx
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)


class ServiceStatus(str, Enum):
    """Service status"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


class ServiceInfo:
    """Service information"""

    def __init__(self, name: str, url: str, health_path: str = "/health"):
        self.name = name
        self.url = url
        self.health_path = health_path
        self.status = ServiceStatus.UNKNOWN
        self.last_check = None
        self.metadata = {}

    def is_healthy(self) -> bool:
        """Check if service is healthy"""
        return self.status == ServiceStatus.HEALTHY

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "url": self.url,
            "status": self.status,
            "last_check": self.last_check.isoformat() if self.last_check else None,
            "metadata": self.metadata
        }


class ServiceRegistry:
    """Service registry for managing microservices"""

    def __init__(self):
        self.services: Dict[str, ServiceInfo] = {}
        self.redis_client = None
        self.http_client = None
        self._health_check_task = None

    async def initialize(self):
        """Initialize service registry"""
        # Create HTTP client
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(settings.SERVICE_HEALTH_CHECK_TIMEOUT)
        )

        # Connect to Redis for service coordination
        if settings.SERVICE_DISCOVERY_ENABLED:
            self.redis_client = await aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True
            )

            # Start health check task
            self._health_check_task = asyncio.create_task(self._health_check_loop())

        logger.info("Service registry initialized")

    async def shutdown(self):
        """Shutdown service registry"""
        # Cancel health check task
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass

        # Close connections
        if self.http_client:
            await self.http_client.aclose()

        if self.redis_client:
            await self.redis_client.close()

        logger.info("Service registry shutdown")

    async def register_service(self, name: str, url: str, health_path: str = "/health"):
        """Register a service"""
        service = ServiceInfo(name, url, health_path)
        self.services[name] = service

        # Perform initial health check
        await self._check_service_health(service)

        # Store in Redis if enabled
        if self.redis_client:
            await self.redis_client.hset(
                "services",
                name,
                service.url
            )

        logger.info(f"Registered service: {name} at {url}")

    async def unregister_service(self, name: str):
        """Unregister a service"""
        if name in self.services:
            del self.services[name]

            # Remove from Redis
            if self.redis_client:
                await self.redis_client.hdel("services", name)

            logger.info(f"Unregistered service: {name}")

    def get_service(self, name: str) -> Optional[ServiceInfo]:
        """Get service by name"""
        return self.services.get(name)

    def get_service_url(self, name: str) -> Optional[str]:
        """Get service URL by name"""
        service = self.get_service(name)
        return service.url if service and service.is_healthy() else None

    def get_all_services(self) -> Dict[str, ServiceInfo]:
        """Get all registered services"""
        return self.services

    def get_healthy_services(self) -> Dict[str, ServiceInfo]:
        """Get all healthy services"""
        return {
            name: service
            for name, service in self.services.items()
            if service.is_healthy()
        }

    async def _check_service_health(self, service: ServiceInfo):
        """Check health of a service"""
        try:
            response = await self.http_client.get(
                f"{service.url}{service.health_path}"
            )

            if response.status_code == 200:
                service.status = ServiceStatus.HEALTHY
                service.metadata = response.json() if response.headers.get("content-type") == "application/json" else {}
            else:
                service.status = ServiceStatus.UNHEALTHY

        except Exception as e:
            logger.warning(f"Health check failed for {service.name}: {e}")
            service.status = ServiceStatus.UNHEALTHY

        service.last_check = datetime.utcnow()

    async def _health_check_loop(self):
        """Background task for periodic health checks"""
        while True:
            try:
                await asyncio.sleep(settings.SERVICE_HEALTH_CHECK_INTERVAL)

                # Check all services
                tasks = [
                    self._check_service_health(service)
                    for service in self.services.values()
                ]
                await asyncio.gather(*tasks, return_exceptions=True)

                # Update Redis with current status
                if self.redis_client:
                    service_status = {
                        name: service.to_dict()
                        for name, service in self.services.items()
                    }
                    await self.redis_client.set(
                        "service_status",
                        str(service_status),
                        ex=settings.SERVICE_HEALTH_CHECK_INTERVAL * 2
                    )

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in health check loop: {e}")

    async def call_service(self, service_name: str, method: str, path: str,
                          **kwargs) -> httpx.Response:
        """Call a service with automatic retry and circuit breaking"""
        service = self.get_service(service_name)
        if not service:
            raise ValueError(f"Service {service_name} not found")

        if not service.is_healthy():
            # Try to check health again
            await self._check_service_health(service)
            if not service.is_healthy():
                raise HTTPException(503, f"Service {service_name} is unavailable")

        url = f"{service.url}{path}"

        try:
            response = await self.http_client.request(
                method=method,
                url=url,
                timeout=settings.REQUEST_TIMEOUT,
                **kwargs
            )
            return response

        except httpx.TimeoutException:
            service.status = ServiceStatus.UNHEALTHY
            raise HTTPException(504, f"Service {service_name} timed out")

        except Exception as e:
            logger.error(f"Error calling service {service_name}: {e}")
            service.status = ServiceStatus.UNHEALTHY
            raise HTTPException(502, f"Error communicating with {service_name}")
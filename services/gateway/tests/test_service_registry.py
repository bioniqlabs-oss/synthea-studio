"""Tests for service registry"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.core.service_registry import ServiceRegistry, ServiceInfo, ServiceStatus


@pytest.mark.asyncio
class TestServiceRegistry:
    """Test service registry functionality"""

    async def test_register_service(self):
        """Test registering a new service"""
        registry = ServiceRegistry()
        registry.http_client = AsyncMock()
        registry.redis_client = AsyncMock()

        # Mock health check response
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {"status": "healthy"}
        response.headers = {"content-type": "application/json"}
        registry.http_client.get.return_value = response

        await registry.register_service("test-service", "http://test:8000", "/health")

        assert "test-service" in registry.services
        service = registry.services["test-service"]
        assert service.url == "http://test:8000"
        assert service.status == ServiceStatus.HEALTHY

    async def test_unregister_service(self):
        """Test unregistering a service"""
        registry = ServiceRegistry()
        registry.redis_client = AsyncMock()

        # Register service first
        service = ServiceInfo("test-service", "http://test:8000")
        registry.services["test-service"] = service

        await registry.unregister_service("test-service")

        assert "test-service" not in registry.services
        registry.redis_client.hdel.assert_called_once_with("services", "test-service")

    def test_get_service(self):
        """Test getting service by name"""
        registry = ServiceRegistry()
        service = ServiceInfo("test-service", "http://test:8000")
        registry.services["test-service"] = service

        retrieved = registry.get_service("test-service")
        assert retrieved == service

        non_existent = registry.get_service("non-existent")
        assert non_existent is None

    def test_get_healthy_services(self):
        """Test getting only healthy services"""
        registry = ServiceRegistry()

        # Add healthy service
        healthy_service = ServiceInfo("healthy", "http://healthy:8000")
        healthy_service.status = ServiceStatus.HEALTHY
        registry.services["healthy"] = healthy_service

        # Add unhealthy service
        unhealthy_service = ServiceInfo("unhealthy", "http://unhealthy:8000")
        unhealthy_service.status = ServiceStatus.UNHEALTHY
        registry.services["unhealthy"] = unhealthy_service

        healthy_services = registry.get_healthy_services()
        assert len(healthy_services) == 1
        assert "healthy" in healthy_services
        assert "unhealthy" not in healthy_services

    async def test_health_check_healthy(self):
        """Test health check for healthy service"""
        registry = ServiceRegistry()
        registry.http_client = AsyncMock()

        # Mock successful health check
        response = MagicMock()
        response.status_code = 200
        response.json.return_value = {"status": "ok"}
        response.headers = {"content-type": "application/json"}
        registry.http_client.get.return_value = response

        service = ServiceInfo("test", "http://test:8000")
        await registry._check_service_health(service)

        assert service.status == ServiceStatus.HEALTHY
        assert service.last_check is not None
        assert "status" in service.metadata

    async def test_health_check_unhealthy(self):
        """Test health check for unhealthy service"""
        registry = ServiceRegistry()
        registry.http_client = AsyncMock()

        # Mock failed health check
        response = MagicMock()
        response.status_code = 500
        registry.http_client.get.return_value = response

        service = ServiceInfo("test", "http://test:8000")
        await registry._check_service_health(service)

        assert service.status == ServiceStatus.UNHEALTHY
        assert service.last_check is not None

    async def test_health_check_timeout(self):
        """Test health check with timeout"""
        registry = ServiceRegistry()
        registry.http_client = AsyncMock()

        # Mock timeout exception
        registry.http_client.get.side_effect = Exception("Timeout")

        service = ServiceInfo("test", "http://test:8000")
        await registry._check_service_health(service)

        assert service.status == ServiceStatus.UNHEALTHY
        assert service.last_check is not None

    async def test_call_service_success(self):
        """Test successful service call"""
        registry = ServiceRegistry()
        registry.http_client = AsyncMock()

        # Add healthy service
        service = ServiceInfo("test", "http://test:8000")
        service.status = ServiceStatus.HEALTHY
        registry.services["test"] = service

        # Mock successful response
        response = MagicMock()
        response.status_code = 200
        registry.http_client.request.return_value = response

        result = await registry.call_service("test", "GET", "/api/test")

        assert result == response
        registry.http_client.request.assert_called_once()

    async def test_call_service_not_found(self):
        """Test calling non-existent service"""
        registry = ServiceRegistry()

        with pytest.raises(ValueError) as exc_info:
            await registry.call_service("non-existent", "GET", "/api/test")

        assert "Service non-existent not found" in str(exc_info.value)
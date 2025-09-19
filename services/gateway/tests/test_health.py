"""Tests for health endpoints"""

import pytest
from unittest.mock import patch


class TestHealthEndpoints:
    """Test health check endpoints"""

    def test_health_check(self, test_client):
        """Test basic health check"""
        response = test_client.get("/health/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "api-gateway"

    def test_liveness_check(self, test_client):
        """Test liveness check"""
        response = test_client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "alive"

    @patch("app.routers.health.request")
    def test_readiness_check_all_healthy(self, mock_request, test_client, mock_service_registry):
        """Test readiness check with all services healthy"""
        # Setup mock
        mock_request.app.state.services = mock_service_registry

        response = test_client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ready"
        assert "services" in data

    @patch("app.routers.health.request")
    def test_readiness_check_degraded(self, mock_request, test_client, mock_service_registry):
        """Test readiness check with degraded service"""
        # Make one service unhealthy
        fhir_service = mock_service_registry.get_service("fhir")
        fhir_service.is_healthy.return_value = False

        mock_request.app.state.services = mock_service_registry

        response = test_client.get("/health/ready")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"

    @patch("app.routers.health.request")
    def test_list_services(self, mock_request, test_client, mock_service_registry):
        """Test listing all services"""
        mock_request.app.state.services = mock_service_registry

        response = test_client.get("/health/services")
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        assert len(data["services"]) == 2

    @patch("app.routers.health.request")
    def test_get_metrics(self, mock_request, test_client, mock_service_registry):
        """Test getting service metrics"""
        mock_request.app.state.services = mock_service_registry

        response = test_client.get("/health/metrics")
        assert response.status_code == 200
        data = response.json()
        assert "requests_total" in data
        assert "average_latency_ms" in data
        assert "services_healthy" in data
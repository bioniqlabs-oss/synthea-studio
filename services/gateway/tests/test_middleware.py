"""Tests for middleware components"""

import pytest
import time
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import Request, HTTPException

from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.cache import CacheMiddleware
from app.middleware.auth import AuthMiddleware, create_access_token, decode_access_token
from app.middleware.logging import LoggingMiddleware


@pytest.mark.asyncio
class TestRateLimitMiddleware:
    """Test rate limiting middleware"""

    async def test_rate_limit_allows_within_limit(self):
        """Test requests within rate limit are allowed"""
        app = MagicMock()
        middleware = RateLimitMiddleware(app, calls=10, period=60)

        request = MagicMock(spec=Request)
        request.url.path = "/api/test"
        request.client.host = "127.0.0.1"

        call_next = AsyncMock(return_value=MagicMock())

        # Make requests within limit
        for _ in range(5):
            response = await middleware.dispatch(request, call_next)
            assert response is not None

        assert call_next.call_count == 5

    async def test_rate_limit_blocks_over_limit(self):
        """Test requests over rate limit are blocked"""
        app = MagicMock()
        middleware = RateLimitMiddleware(app, calls=2, period=60)

        request = MagicMock(spec=Request)
        request.url.path = "/api/test"
        request.client.host = "127.0.0.1"

        call_next = AsyncMock(return_value=MagicMock())

        # Make requests up to limit
        for _ in range(2):
            await middleware.dispatch(request, call_next)

        # Next request should be blocked
        with pytest.raises(HTTPException) as exc_info:
            await middleware.dispatch(request, call_next)

        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in exc_info.value.detail

    async def test_rate_limit_excludes_paths(self):
        """Test excluded paths are not rate limited"""
        app = MagicMock()
        middleware = RateLimitMiddleware(app, calls=1, period=60)

        request = MagicMock(spec=Request)
        request.url.path = "/health"
        request.client.host = "127.0.0.1"

        call_next = AsyncMock(return_value=MagicMock())

        # Make multiple requests to excluded path
        for _ in range(5):
            response = await middleware.dispatch(request, call_next)
            assert response is not None

        assert call_next.call_count == 5


@pytest.mark.asyncio
class TestCacheMiddleware:
    """Test caching middleware"""

    async def test_cache_miss_and_store(self, mock_redis_client):
        """Test cache miss stores response"""
        app = MagicMock()
        middleware = CacheMiddleware(app, ttl=300)
        middleware.redis_client = mock_redis_client

        request = MagicMock(spec=Request)
        request.url.path = "/api/populations"
        request.method = "GET"
        request.query_params = {}

        response = MagicMock()
        response.status_code = 200
        response.body_iterator = middleware._async_generator(b'{"data": "test"}')
        response.headers = {}
        response.media_type = "application/json"

        call_next = AsyncMock(return_value=response)

        # First call should miss cache
        mock_redis_client.get.return_value = None
        result = await middleware.dispatch(request, call_next)

        assert call_next.called
        mock_redis_client.setex.assert_called_once()

    async def test_cache_hit(self, mock_redis_client):
        """Test cache hit returns cached response"""
        app = MagicMock()
        middleware = CacheMiddleware(app, ttl=300)
        middleware.redis_client = mock_redis_client

        request = MagicMock(spec=Request)
        request.url.path = "/api/populations"
        request.method = "GET"
        request.query_params = {}

        # Mock cached response
        cached_data = {
            "content": '{"data": "cached"}',
            "status_code": 200,
            "headers": {},
            "media_type": "application/json"
        }
        mock_redis_client.get.return_value = str(cached_data)

        call_next = AsyncMock()

        result = await middleware.dispatch(request, call_next)

        # Should not call next handler
        assert not call_next.called

    async def test_cache_only_successful_responses(self, mock_redis_client):
        """Test only successful responses are cached"""
        app = MagicMock()
        middleware = CacheMiddleware(app, ttl=300)
        middleware.redis_client = mock_redis_client

        request = MagicMock(spec=Request)
        request.url.path = "/api/populations"
        request.method = "GET"
        request.query_params = {}

        # Return error response
        response = MagicMock()
        response.status_code = 404
        response.body_iterator = middleware._async_generator(b'{"error": "not found"}')

        call_next = AsyncMock(return_value=response)
        mock_redis_client.get.return_value = None

        await middleware.dispatch(request, call_next)

        # Should not cache error response
        mock_redis_client.setex.assert_not_called()


class TestAuthMiddleware:
    """Test authentication middleware"""

    def test_create_access_token(self):
        """Test creating JWT access token"""
        data = {"sub": "user123", "role": "admin"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)

    def test_decode_valid_token(self):
        """Test decoding valid JWT token"""
        data = {"sub": "user123", "role": "admin"}
        token = create_access_token(data)

        decoded = decode_access_token(token)
        assert decoded["sub"] == "user123"
        assert decoded["role"] == "admin"

    def test_decode_invalid_token(self):
        """Test decoding invalid JWT token"""
        with pytest.raises(HTTPException) as exc_info:
            decode_access_token("invalid.token.here")

        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_auth_middleware_valid_token(self):
        """Test auth middleware with valid token"""
        app = MagicMock()
        middleware = AuthMiddleware(app, secret_key="test-secret")

        request = MagicMock(spec=Request)
        request.url.path = "/api/test"
        request.headers = {"Authorization": f"Bearer {create_access_token({'sub': 'user123'})}"}
        request.state = MagicMock()

        call_next = AsyncMock(return_value=MagicMock())

        response = await middleware.dispatch(request, call_next)

        assert response is not None
        assert request.state.user["sub"] == "user123"

    @pytest.mark.asyncio
    async def test_auth_middleware_missing_token(self):
        """Test auth middleware with missing token"""
        app = MagicMock()
        middleware = AuthMiddleware(app, secret_key="test-secret")

        request = MagicMock(spec=Request)
        request.url.path = "/api/test"
        request.headers = {}

        call_next = AsyncMock()

        with pytest.raises(HTTPException) as exc_info:
            await middleware.dispatch(request, call_next)

        assert exc_info.value.status_code == 401
        assert "Missing authentication token" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_auth_middleware_excludes_paths(self):
        """Test auth middleware excludes certain paths"""
        app = MagicMock()
        middleware = AuthMiddleware(app, secret_key="test-secret")

        request = MagicMock(spec=Request)
        request.url.path = "/health"
        request.headers = {}

        call_next = AsyncMock(return_value=MagicMock())

        # Should not require auth for excluded path
        response = await middleware.dispatch(request, call_next)
        assert response is not None
"""Caching middleware"""

import hashlib
import json
import logging
from typing import Optional

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)


class CacheMiddleware(BaseHTTPMiddleware):
    """Response caching middleware"""

    def __init__(self, app, ttl: int = 300):
        super().__init__(app)
        self.ttl = ttl
        self.redis_client = None

        # Paths to cache
        self.cached_paths = [
            "/api/populations",
            "/api/analytics",
            "/api/fhir/Patient",
            "/api/fhir/Condition",
            "/api/fhir/Observation",
        ]

        # Methods to cache
        self.cached_methods = ["GET"]

    async def dispatch(self, request: Request, call_next):
        """Process request with caching"""
        # Only cache specific paths and methods
        if not self._should_cache(request):
            return await call_next(request)

        # Generate cache key
        cache_key = self._generate_cache_key(request)

        # Try to get from cache
        cached_response = await self._get_cached_response(cache_key)
        if cached_response:
            logger.debug(f"Cache hit for {cache_key}")
            return Response(
                content=cached_response["content"],
                status_code=cached_response["status_code"],
                headers=cached_response["headers"],
                media_type=cached_response["media_type"]
            )

        # Process request
        response = await call_next(request)

        # Cache successful responses
        if 200 <= response.status_code < 300:
            await self._cache_response(cache_key, response)

        return response

    def _should_cache(self, request: Request) -> bool:
        """Check if request should be cached"""
        if request.method not in self.cached_methods:
            return False

        for path in self.cached_paths:
            if request.url.path.startswith(path):
                return True

        return False

    def _generate_cache_key(self, request: Request) -> str:
        """Generate unique cache key for request"""
        # Include method, path, query params, and user if authenticated
        key_parts = [
            request.method,
            request.url.path,
            str(sorted(request.query_params.items()))
        ]

        if hasattr(request.state, "user") and request.state.user:
            key_parts.append(request.state.user.get("sub", ""))

        key_string = ":".join(key_parts)
        return f"cache:{hashlib.md5(key_string.encode()).hexdigest()}"

    async def _get_cached_response(self, cache_key: str) -> Optional[dict]:
        """Get cached response from Redis"""
        if not await self._connect_redis():
            return None

        try:
            cached_data = await self.redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Failed to get cached response: {e}")

        return None

    async def _cache_response(self, cache_key: str, response: Response):
        """Cache response in Redis"""
        if not await self._connect_redis():
            return

        try:
            # Read response body
            body = b""
            async for chunk in response.body_iterator:
                body += chunk

            # Create new response with body
            response.body_iterator = self._async_generator(body)

            # Cache response data
            cache_data = {
                "content": body.decode("utf-8") if body else "",
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "media_type": response.media_type
            }

            await self.redis_client.setex(
                cache_key,
                self.ttl,
                json.dumps(cache_data)
            )

            logger.debug(f"Cached response for {cache_key}")

        except Exception as e:
            logger.warning(f"Failed to cache response: {e}")

    async def _connect_redis(self) -> bool:
        """Connect to Redis if not connected"""
        if self.redis_client is None:
            try:
                self.redis_client = await aioredis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True
                )
                return True
            except Exception as e:
                logger.warning(f"Failed to connect to Redis for caching: {e}")
                return False
        return True

    @staticmethod
    async def _async_generator(data: bytes):
        """Create async generator from bytes"""
        yield data


async def invalidate_cache(pattern: str = "*"):
    """Invalidate cache entries matching pattern"""
    try:
        redis_client = await aioredis.from_url(settings.REDIS_URL)
        keys = await redis_client.keys(f"cache:{pattern}")
        if keys:
            await redis_client.delete(*keys)
            logger.info(f"Invalidated {len(keys)} cache entries")
    except Exception as e:
        logger.warning(f"Failed to invalidate cache: {e}")
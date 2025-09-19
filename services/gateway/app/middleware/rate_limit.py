"""Rate limiting middleware"""

import time
import logging
from collections import defaultdict
from typing import Dict, Tuple

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using sliding window"""

    def __init__(self, app, calls: int = 100, period: int = 60):
        super().__init__(app)
        self.calls = calls
        self.period = period
        self.redis_client = None
        self.local_cache = defaultdict(list)  # Fallback if Redis unavailable

        # Paths excluded from rate limiting
        self.excluded_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]

    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""
        # Skip rate limiting for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)

        # Get client identifier
        client_id = self._get_client_id(request)

        # Check rate limit
        if not await self._check_rate_limit(client_id):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
                headers={
                    "X-RateLimit-Limit": str(self.calls),
                    "X-RateLimit-Period": str(self.period),
                    "Retry-After": str(self.period)
                }
            )

        response = await call_next(request)

        # Add rate limit headers
        remaining_calls = await self._get_remaining_calls(client_id)
        response.headers["X-RateLimit-Limit"] = str(self.calls)
        response.headers["X-RateLimit-Remaining"] = str(remaining_calls)
        response.headers["X-RateLimit-Reset"] = str(int(time.time()) + self.period)

        return response

    def _get_client_id(self, request: Request) -> str:
        """Get client identifier from request"""
        # Try to get from authenticated user
        if hasattr(request.state, "user") and request.state.user:
            return f"user:{request.state.user.get('sub', 'unknown')}"

        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        return f"ip:{client_ip}"

    async def _check_rate_limit(self, client_id: str) -> bool:
        """Check if client has exceeded rate limit"""
        # Try Redis first
        if await self._connect_redis():
            return await self._check_redis_rate_limit(client_id)

        # Fall back to local cache
        return self._check_local_rate_limit(client_id)

    async def _check_redis_rate_limit(self, client_id: str) -> bool:
        """Check rate limit using Redis"""
        try:
            key = f"rate_limit:{client_id}"
            current_time = int(time.time())
            window_start = current_time - self.period

            # Remove old entries
            await self.redis_client.zremrangebyscore(key, 0, window_start)

            # Count current entries
            current_count = await self.redis_client.zcard(key)

            if current_count >= self.calls:
                return False

            # Add current request
            await self.redis_client.zadd(key, {str(current_time): current_time})
            await self.redis_client.expire(key, self.period)

            return True

        except Exception as e:
            logger.warning(f"Redis rate limit check failed: {e}")
            # Fall back to local cache
            return self._check_local_rate_limit(client_id)

    def _check_local_rate_limit(self, client_id: str) -> bool:
        """Check rate limit using local cache"""
        current_time = time.time()
        window_start = current_time - self.period

        # Clean old entries
        self.local_cache[client_id] = [
            timestamp for timestamp in self.local_cache[client_id]
            if timestamp > window_start
        ]

        # Check limit
        if len(self.local_cache[client_id]) >= self.calls:
            return False

        # Add current request
        self.local_cache[client_id].append(current_time)
        return True

    async def _get_remaining_calls(self, client_id: str) -> int:
        """Get remaining calls for client"""
        if await self._connect_redis():
            try:
                key = f"rate_limit:{client_id}"
                current_time = int(time.time())
                window_start = current_time - self.period
                count = await self.redis_client.zcount(key, window_start, current_time)
                return max(0, self.calls - count)
            except Exception:
                pass

        # Fall back to local cache
        current_time = time.time()
        window_start = current_time - self.period
        valid_calls = [t for t in self.local_cache[client_id] if t > window_start]
        return max(0, self.calls - len(valid_calls))

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
                logger.warning(f"Failed to connect to Redis for rate limiting: {e}")
                return False
        return True
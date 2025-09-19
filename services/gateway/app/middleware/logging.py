"""Request/Response logging middleware"""

import time
import json
import logging
import uuid
from typing import Dict, Any

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and responses"""

    def __init__(self, app):
        super().__init__(app)
        self.excluded_paths = [
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
        ]

    async def dispatch(self, request: Request, call_next):
        """Log request and response"""
        # Skip logging for excluded paths
        if any(request.url.path.startswith(path) for path in self.excluded_paths):
            return await call_next(request)

        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # Log request
        start_time = time.time()
        request_log = self._create_request_log(request, request_id)
        logger.info(f"Request: {json.dumps(request_log)}")

        # Process request
        try:
            response = await call_next(request)

            # Add request ID to response headers
            response.headers["X-Request-ID"] = request_id

            # Log response
            duration = time.time() - start_time
            response_log = self._create_response_log(
                response, request_id, duration
            )
            logger.info(f"Response: {json.dumps(response_log)}")

            return response

        except Exception as e:
            # Log error
            duration = time.time() - start_time
            error_log = self._create_error_log(
                e, request_id, duration
            )
            logger.error(f"Error: {json.dumps(error_log)}")
            raise

    def _create_request_log(self, request: Request, request_id: str) -> Dict[str, Any]:
        """Create request log entry"""
        return {
            "type": "request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": dict(request.query_params),
            "client": {
                "host": request.client.host if request.client else None,
                "port": request.client.port if request.client else None,
            },
            "headers": {
                k: v for k, v in request.headers.items()
                if k.lower() not in ["authorization", "cookie"]
            },
            "user": getattr(request.state, "user", {}).get("sub") if hasattr(request.state, "user") else None,
        }

    def _create_response_log(self, response, request_id: str, duration: float) -> Dict[str, Any]:
        """Create response log entry"""
        return {
            "type": "response",
            "request_id": request_id,
            "status_code": response.status_code,
            "duration_ms": round(duration * 1000, 2),
            "headers": dict(response.headers),
        }

    def _create_error_log(self, error: Exception, request_id: str, duration: float) -> Dict[str, Any]:
        """Create error log entry"""
        return {
            "type": "error",
            "request_id": request_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "duration_ms": round(duration * 1000, 2),
        }
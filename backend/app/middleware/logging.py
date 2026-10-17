import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("learnova")

# Sensitive header keys to sanitize
SENSITIVE_HEADERS = {"authorization", "cookie", "set-cookie", "x-api-key", "token"}


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware recording structured request metadata, latency, and status."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
        start_time = time.perf_counter()

        # Sanitize query parameters if sensitive keys exist
        query_params = dict(request.query_params)
        for key in list(query_params.keys()):
            if any(
                s in key.lower() for s in ["password", "secret", "token", "key", "auth"]
            ):
                query_params[key] = "[REDACTED]"

        response: Response
        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Add request ID to response header
            response.headers["x-request-id"] = request_id

            logger.info(
                f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                    "service": "learnova-backend",
                },
            )
            return response
        except Exception:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception(
                f"{request.method} {request.url.path} failed after {duration_ms}ms",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": 500,
                    "duration_ms": duration_ms,
                    "service": "learnova-backend",
                },
            )
            raise

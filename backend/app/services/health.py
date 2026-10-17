import logging
from datetime import datetime, timezone

from backend.app.core.config import get_settings
from backend.app.db.session import check_database_connection
from backend.app.redis.client import check_redis_connection
from backend.app.schemas.health import (
    ComponentHealth,
    CompositeHealthResponse,
    SimpleHealthResponse,
)

logger = logging.getLogger("learnova")


class HealthService:
    """Service orchestrating infrastructure and service health checks."""

    @staticmethod
    def get_simple_health() -> SimpleHealthResponse:
        """Returns standard basic service identity and version."""
        settings = get_settings()
        return SimpleHealthResponse(
            status="ok",
            service="learnova-backend",
            version=settings.APP_VERSION,
        )

    @staticmethod
    async def get_database_health() -> ComponentHealth:
        """Executes actual query to verify PostgreSQL connectivity."""
        result = await check_database_connection()
        return ComponentHealth(
            status=result["status"],
            connected=result["connected"],
            latency_ms=result["latency_ms"],
            version=result["version"],
            error=result["error"],
        )

    @staticmethod
    async def get_redis_health() -> ComponentHealth:
        """Executes actual ping to verify Redis connectivity."""
        result = await check_redis_connection()
        return ComponentHealth(
            status=result["status"],
            connected=result["connected"],
            latency_ms=result["latency_ms"],
            version=result["version"],
            error=result["error"],
        )

    @classmethod
    async def get_composite_health(cls) -> CompositeHealthResponse:
        """Evaluates health across all critical dependencies."""
        settings = get_settings()
        db_health = await cls.get_database_health()
        redis_health = await cls.get_redis_health()

        api_health = ComponentHealth(
            status="healthy",
            connected=True,
            latency_ms=0.0,
            version=settings.APP_VERSION,
            error=None,
        )

        components = {
            "api": api_health,
            "database": db_health,
            "redis": redis_health,
        }

        # Determine overall aggregate status
        if not db_health.connected and not redis_health.connected:
            overall_status = "unhealthy"
        elif not db_health.connected or not redis_health.connected:
            overall_status = "degraded"
        else:
            overall_status = "ok"

        return CompositeHealthResponse(
            status=overall_status,
            service="learnova-backend",
            version=settings.APP_VERSION,
            environment=settings.APP_ENV,
            timestamp=datetime.now(timezone.utc),
            components=components,
        )

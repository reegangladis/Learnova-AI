from fastapi import APIRouter, Response, status

from backend.app.schemas.health import (
    ComponentHealth,
    CompositeHealthResponse,
    SimpleHealthResponse,
)
from backend.app.services.health import HealthService

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get(
    "",
    response_model=SimpleHealthResponse,
    summary="Basic Service Health",
    description="Returns basic identity, service name, and version confirmation.",
)
async def get_basic_health() -> SimpleHealthResponse:
    """Basic ping health check."""
    return HealthService.get_simple_health()


@router.get(
    "/database",
    response_model=ComponentHealth,
    summary="PostgreSQL Database Health",
    description="Performs an active database query check to verify connectivity and latency.",
)
async def get_database_health(response: Response) -> ComponentHealth:
    """Active PostgreSQL database connectivity check."""
    health = await HealthService.get_database_health()
    if not health.connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return health


@router.get(
    "/redis",
    response_model=ComponentHealth,
    summary="Redis Cache Health",
    description="Performs an active Redis ping check to verify connectivity and latency.",
)
async def get_redis_health(response: Response) -> ComponentHealth:
    """Active Redis connectivity check."""
    health = await HealthService.get_redis_health()
    if not health.connected:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return health


@router.get(
    "/all",
    response_model=CompositeHealthResponse,
    summary="Full Composite System Health",
    description="Evaluates all critical system dependencies (API, Database, Redis) and returns comprehensive diagnostics.",
)
async def get_full_health(response: Response) -> CompositeHealthResponse:
    """Aggregated subsystem health evaluation."""
    composite = await HealthService.get_composite_health()
    if composite.status == "unhealthy":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif composite.status == "degraded":
        response.status_code = status.HTTP_200_OK
    return composite

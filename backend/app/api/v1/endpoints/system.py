import platform
import sys
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend.app.core.config import get_settings

router = APIRouter(prefix="/system", tags=["System Information"])


class SystemInfoResponse(BaseModel):
    """System information response model."""

    app_name: str = Field(..., description="Application name")
    app_version: str = Field(..., description="Application version")
    app_env: str = Field(..., description="Environment")
    python_version: str = Field(..., description="Python runtime version")
    platform: str = Field(..., description="Operating system platform")
    server_time_utc: datetime = Field(..., description="Current server UTC timestamp")
    api_prefix: str = Field(..., description="API v1 route prefix")


@router.get(
    "/info",
    response_model=SystemInfoResponse,
    summary="System Information",
    description="Returns runtime system metadata and environment details.",
)
async def get_system_info() -> SystemInfoResponse:
    """Returns runtime metadata."""
    settings = get_settings()
    return SystemInfoResponse(
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        app_env=settings.APP_ENV,
        python_version=sys.version.split(" ")[0],
        platform=platform.platform(),
        server_time_utc=datetime.now(timezone.utc),
        api_prefix=settings.API_V1_PREFIX,
    )

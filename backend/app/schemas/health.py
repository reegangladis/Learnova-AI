from datetime import datetime

from pydantic import BaseModel, Field


class SimpleHealthResponse(BaseModel):
    """Primary health check response model."""

    status: str = Field(..., description="Overall service status (e.g. 'ok')")
    service: str = Field(..., description="Name of the service")
    version: str = Field(..., description="Version of the service")


class ComponentHealth(BaseModel):
    """Detailed health status of a single infrastructure component."""

    status: str = Field(
        ..., description="Component status: 'healthy', 'degraded', or 'unhealthy'"
    )
    connected: bool = Field(..., description="Connection active flag")
    latency_ms: float | None = Field(
        None, description="Check round-trip latency in milliseconds"
    )
    version: str | None = Field(None, description="Reported component software version")
    error: str | None = Field(None, description="Error message if check failed")


class CompositeHealthResponse(BaseModel):
    """Comprehensive health check across all subsystem dependencies."""

    status: str = Field(
        ..., description="Aggregated status: 'ok', 'degraded', or 'unhealthy'"
    )
    service: str = Field(..., description="Name of the service")
    version: str = Field(..., description="Service version")
    environment: str = Field(..., description="Deployment environment")
    timestamp: datetime = Field(..., description="Timestamp of health evaluation")
    components: dict[str, ComponentHealth] = Field(
        ..., description="Individual subsystem health metrics"
    )

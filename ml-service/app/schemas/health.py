from datetime import datetime

from pydantic import BaseModel, Field


class MLServiceHealthResponse(BaseModel):
    """Health response model for Learnova ML Service."""

    status: str = Field(..., description="Service status (e.g. 'ok')")
    service: str = Field(..., description="Service identifier: 'learnova-ml-service'")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(..., description="Evaluation timestamp")
    capabilities: dict[str, str] = Field(
        default_factory=dict, description="ML engine capabilities"
    )

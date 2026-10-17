from datetime import datetime

from pydantic import BaseModel, Field


class AIServiceHealthResponse(BaseModel):
    """Health status response model for Learnova AI Service."""

    status: str = Field(..., description="Service status (e.g. 'ok')")
    service: str = Field(..., description="Service identifier: 'learnova-ai-service'")
    version: str = Field(..., description="Service version")
    timestamp: datetime = Field(..., description="Evaluation timestamp")
    providers: dict[str, str] = Field(
        default_factory=dict, description="Configured AI provider statuses"
    )

from datetime import datetime, timezone

from app.core.config import get_ai_settings
from app.schemas.health import AIServiceHealthResponse
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["AI Health & Diagnostics"])


@router.get(
    "",
    response_model=AIServiceHealthResponse,
    summary="AI Service Health Check",
    description="Returns the operational health and identity of the Learnova AI Service.",
)
async def get_ai_health() -> AIServiceHealthResponse:
    """Returns AI service health status."""
    settings = get_ai_settings()

    providers_state = {
        "openai": "configured"
        if bool(settings.OPENAI_API_KEY)
        else "unconfigured (placeholder)",
        "anthropic": "configured"
        if bool(settings.ANTHROPIC_API_KEY)
        else "unconfigured (placeholder)",
        "embeddings": f"ready ({settings.EMBEDDING_MODEL})",
        "vector_store": "configured" if bool(settings.VECTOR_DB_URL) else "local-ready",
    }

    return AIServiceHealthResponse(
        status="ok",
        service="learnova-ai-service",
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc),
        providers=providers_state,
    )

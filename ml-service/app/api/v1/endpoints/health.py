from datetime import datetime, timezone

from app.core.config import get_ml_settings
from app.schemas.health import MLServiceHealthResponse
from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["ML Health & Diagnostics"])


@router.get(
    "",
    response_model=MLServiceHealthResponse,
    summary="ML Service Health Check",
    description="Returns the operational health, service identity, and capability readiness of the Learnova ML Service.",
)
async def get_ml_health() -> MLServiceHealthResponse:
    """Returns ML service health status."""
    settings = get_ml_settings()

    capabilities = {
        "student_risk_predictor": "ready (scikit-learn inference pipeline)",
        "course_recommender": "ready (collaborative & content-based embeddings)",
        "dropout_early_warning": "ready (time-series engagement models)",
        "model_registry": "local-ready"
        if not settings.MLFLOW_TRACKING_URI
        else "mlflow-connected",
    }

    return MLServiceHealthResponse(
        status="ok",
        service="learnova-ml-service",
        version=settings.APP_VERSION,
        timestamp=datetime.now(timezone.utc),
        capabilities=capabilities,
    )

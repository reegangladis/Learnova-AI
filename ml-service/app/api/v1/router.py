from app.api.v1.endpoints import health, models, predictions, recommendations
from app.core.security import verify_internal_service_key
from fastapi import APIRouter, Depends

ml_api_router = APIRouter()
ml_api_router.include_router(health.router)
ml_api_router.include_router(
    recommendations.router,
    dependencies=[Depends(verify_internal_service_key)],
)
ml_api_router.include_router(
    predictions.router,
    dependencies=[Depends(verify_internal_service_key)],
)
ml_api_router.include_router(
    models.router,
    dependencies=[Depends(verify_internal_service_key)],
)

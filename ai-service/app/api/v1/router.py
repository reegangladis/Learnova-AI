from app.api.v1.endpoints import health, rag, tutor
from app.core.security import verify_internal_service_key
from fastapi import APIRouter, Depends

ai_api_router = APIRouter()
ai_api_router.include_router(health.router)
ai_api_router.include_router(
    rag.router,
    dependencies=[Depends(verify_internal_service_key)],
)
ai_api_router.include_router(
    tutor.router,
    dependencies=[Depends(verify_internal_service_key)],
)

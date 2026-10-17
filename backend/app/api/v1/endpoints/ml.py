from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.app.api.deps import (
    get_current_user,
    get_ml_service,
    require_role,
)
from backend.app.models.user import User
from backend.app.schemas.common import APIResponse
from backend.app.schemas.ml import (
    CourseRecommendationsResponse,
    LearningInsightsResponse,
    LearningPathResponse,
    ModelStatusResponse,
    TrainModelRequestDTO,
    TrainModelResponseDTO,
)
from backend.app.services.ml_service import MLService

router = APIRouter(prefix="/ml", tags=["Machine Learning, Recommendations & Insights"])


@router.get(
    "/recommendations",
    response_model=APIResponse[CourseRecommendationsResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve personalized course recommendations",
    description="Returns ranked course recommendations for the authenticated student using content similarity, category matching, or popularity fallback.",
)
async def get_course_recommendations(
    current_user: Annotated[User, Depends(get_current_user)],
    ml_service: Annotated[MLService, Depends(get_ml_service)],
    limit: Annotated[int, Query(ge=1, le=20, description="Max recommendations to return")] = 5,
) -> APIResponse[CourseRecommendationsResponse]:
    result = await ml_service.get_recommendations(current_user=current_user, limit=limit)
    return APIResponse(
        success=True,
        data=result,
        message="Personalized course recommendations retrieved successfully.",
    )


@router.get(
    "/learning-insights",
    response_model=APIResponse[LearningInsightsResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve student learning momentum and risk insights",
    description="Returns pacing momentum, estimated risk level, contributing factors, and supportive study guidance.",
)
async def get_learning_insights(
    current_user: Annotated[User, Depends(get_current_user)],
    ml_service: Annotated[MLService, Depends(get_ml_service)],
) -> APIResponse[LearningInsightsResponse]:
    result = await ml_service.get_learning_insights(current_user=current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Learning insights and study momentum retrieved successfully.",
    )


@router.get(
    "/learning-path",
    response_model=APIResponse[LearningPathResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve suggested next learning steps",
    description="Calculates next curriculum milestone, prerequisite verification status, and formative quiz skill gaps.",
)
async def get_learning_path(
    current_user: Annotated[User, Depends(get_current_user)],
    ml_service: Annotated[MLService, Depends(get_ml_service)],
) -> APIResponse[LearningPathResponse]:
    result = await ml_service.get_learning_path(current_user=current_user)
    return APIResponse(
        success=True,
        data=result,
        message="Suggested learning path milestone generated successfully.",
    )


@router.get(
    "/model-status",
    response_model=APIResponse[ModelStatusResponse],
    status_code=status.HTTP_200_OK,
    summary="Inspect active ML models and evaluation metrics",
    description="Administrative endpoint returning registered model versions, architectures, and evaluation scores.",
)
async def get_model_status(
    current_user: Annotated[
        User,
        Depends(require_role("ADMIN", "SUPER_ADMIN", "INSTRUCTOR")),
    ],
    ml_service: Annotated[MLService, Depends(get_ml_service)],
) -> APIResponse[ModelStatusResponse]:
    result = await ml_service.get_model_status()
    return APIResponse(
        success=True,
        data=result,
        message="Active machine learning model telemetry retrieved successfully.",
    )


@router.post(
    "/models/train",
    response_model=APIResponse[TrainModelResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Train and evaluate student risk model (Admin only)",
    description="Administrative endpoint to trigger training pipeline, compute validation metrics, and persist artifact.",
)
@router.post(
    "/train",
    response_model=APIResponse[TrainModelResponseDTO],
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
async def train_model(
    payload: TrainModelRequestDTO,
    current_user: Annotated[
        User,
        Depends(require_role("ADMIN", "SUPER_ADMIN")),
    ],
    ml_service: Annotated[MLService, Depends(get_ml_service)],
) -> APIResponse[TrainModelResponseDTO]:
    result = await ml_service.train_model(payload)
    return APIResponse(
        success=True,
        data=result,
        message="Model trained, evaluated, and registered successfully.",
    )


from app.models.recommender import CourseRecommender
from app.schemas.recommendations import (
    RecommendationRequest,
    RecommendationResponse,
)
from fastapi import APIRouter, status

router = APIRouter(prefix="/recommendations", tags=["Course Recommendations"])
recommender = CourseRecommender()


@router.post(
    "",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate personalized course recommendations",
    description="Calculates course recommendations using content similarity, category matching, and cold-start fallback.",
)
async def generate_recommendations(request: RecommendationRequest) -> RecommendationResponse:
    return recommender.recommend(request)

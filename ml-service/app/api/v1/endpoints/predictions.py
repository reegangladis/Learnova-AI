from app.models.path_planner import LearningPathPlanner
from app.models.predictor import StudentRiskPredictor
from app.schemas.learning_path import (
    LearningPathRequest,
    LearningPathResponse,
)
from app.schemas.predictions import (
    StudentRiskFeatures,
    StudentRiskPrediction,
)
from fastapi import APIRouter, status

router = APIRouter(tags=["Student Learning Insights & Paths"])
predictor = StudentRiskPredictor()
path_planner = LearningPathPlanner()


@router.post(
    "/predict/risk",
    response_model=StudentRiskPrediction,
    status_code=status.HTTP_200_OK,
    summary="Estimate student learning risk and pacing momentum",
    description="Analyzes learning telemetry to estimate study momentum, pacing risk, and supportive coaching factors.",
)
async def predict_student_risk(features: StudentRiskFeatures) -> StudentRiskPrediction:
    return predictor.predict_risk(features)


@router.post(
    "/learning-path",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate personalized next learning steps",
    description="Evaluates curriculum progression, prerequisites, and quiz skill gaps to recommend the next study action.",
)
async def generate_learning_path(request: LearningPathRequest) -> LearningPathResponse:
    return path_planner.plan_path(request)

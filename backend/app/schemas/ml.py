import uuid
from datetime import datetime

from pydantic import BaseModel, Field

# =============================================================================
# 1. Course Recommendations Schemas
# =============================================================================


class RecommendedCourseDTO(BaseModel):
    course_id: uuid.UUID
    title: str
    slug: str
    short_description: str
    category_name: str | None = None
    difficulty: str
    duration_minutes: int
    score: float = Field(..., description="Calculated recommendation score [0.0 - 1.0]")
    strategy: str = Field(..., description="Recommendation strategy: 'content_based', 'category_matching', 'popularity_fallback'")
    reason: str = Field(..., description="Student-facing justification for the recommendation")
    matching_topics: list[str] = Field(default_factory=list)


class CourseRecommendationsResponse(BaseModel):
    recommendations: list[RecommendedCourseDTO]
    total_evaluated: int
    applied_strategy: str
    is_fallback: bool


# =============================================================================
# 2. Learning-Risk & Momentum Insights Schemas
# =============================================================================


class ContributingFactorDTO(BaseModel):
    factor_name: str
    impact: str = Field(..., description="'positive', 'neutral', or 'concerning'")
    description: str
    weight: float = Field(default=0.0)


class LearningInsightsResponse(BaseModel):
    student_id: uuid.UUID
    risk_level: str = Field(..., description="'low', 'moderate', 'high', or 'insufficient_data'")
    risk_score: float = Field(..., ge=0.0, le=1.0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    momentum_status: str = Field(..., description="'accelerating', 'steady', 'needs_attention', or 'insufficient_data'")
    contributing_factors: list[ContributingFactorDTO] = Field(default_factory=list)
    supportive_guidance: list[str] = Field(default_factory=list)
    model_version: str = Field(default="v1.0.0")
    is_insufficient_data: bool = Field(default=False)


# =============================================================================
# 3. Learning Path Schemas
# =============================================================================


class PrerequisiteCheckDTO(BaseModel):
    prerequisite_name: str
    is_met: bool
    evidence: str


class SkillGapAlertDTO(BaseModel):
    topic: str
    assessment_title: str
    score: float
    recommendation: str


class LearningPathStepDTO(BaseModel):
    step_type: str = Field(..., description="'lesson_completion' or 'course_enrollment'")
    title: str
    description: str
    course_id: uuid.UUID | None = None
    course_title: str | None = None
    lesson_id: uuid.UUID | None = None
    lesson_title: str | None = None
    estimated_minutes: int = 15
    confidence_level: str = Field(default="high")


class LearningPathResponse(BaseModel):
    student_id: uuid.UUID
    current_focus: str
    next_step: LearningPathStepDTO
    prerequisite_checks: list[PrerequisiteCheckDTO] = Field(default_factory=list)
    skill_gaps: list[SkillGapAlertDTO] = Field(default_factory=list)
    rationale: str


# =============================================================================
# 4. Model Status & Admin Schemas
# =============================================================================


class ModelEvaluationMetricsDTO(BaseModel):
    accuracy: float
    precision: float
    recall: float
    f1_score: float
    roc_auc: float | None = None
    sample_size: int
    confusion_matrix: list[list[int]] = Field(default_factory=list)


class ModelVersionInfoDTO(BaseModel):
    model_name: str
    version: str
    framework: str
    status: str
    provenance: str = Field(default="synthetic_educational_benchmark", description="Training dataset origin and provenance")
    trained_at: datetime
    metrics: ModelEvaluationMetricsDTO | None = None
    features: list[str] = Field(default_factory=list)


class ModelStatusResponse(BaseModel):
    service_status: str
    active_models: list[ModelVersionInfoDTO] = Field(default_factory=list)
    registry_path: str
    last_evaluated: datetime | None = None


class TrainModelRequestDTO(BaseModel):
    model_name: str = Field(default="student_risk_predictor", description="Target model name")
    test_size: float = Field(default=0.2, ge=0.1, le=0.5, description="Holdout evaluation ratio")
    random_state: int = Field(default=42, description="Reproducible random seed")


class TrainModelResponseDTO(BaseModel):
    success: bool
    model_name: str
    version: str
    status: str = Field(default="experimental", description="Model production readiness status")
    metrics: ModelEvaluationMetricsDTO
    training_samples: int
    test_samples: int
    provenance: str = Field(default="synthetic_educational_benchmark", description="Training dataset provenance")
    message: str


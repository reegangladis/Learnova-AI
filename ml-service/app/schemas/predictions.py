from pydantic import BaseModel, Field


class StudentRiskFeatures(BaseModel):
    """Features provided to estimate learning-risk and pacing momentum."""

    student_id: str = Field(..., description="Student UUID string")
    active_courses_count: int = Field(default=0, ge=0, description="Active enrollments count")
    completed_courses_count: int = Field(default=0, ge=0, description="Completed courses count")
    total_lessons_assigned: int = Field(default=0, ge=0, description="Total lessons in enrolled courses")
    completed_lessons_count: int = Field(default=0, ge=0, description="Completed lessons count")
    lesson_completion_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Completed lessons / total lessons")
    avg_quiz_score: float = Field(default=0.0, ge=0.0, le=100.0, description="Average quiz percentage score")
    quiz_pass_rate: float = Field(default=0.0, ge=0.0, le=100.0, description="Percentage of quiz attempts passed")
    total_quiz_attempts: int = Field(default=0, ge=0, description="Total quiz attempts taken")
    failed_quiz_attempts: int = Field(default=0, ge=0, description="Count of failed quiz attempts")
    days_since_last_activity: int = Field(default=0, ge=0, description="Days since last lesson progress or quiz submission")
    total_study_time_minutes: int = Field(default=0, ge=0, description="Total recorded learning time in minutes")


class ContributingFactor(BaseModel):
    """Specific measurable factor impacting the student's risk or momentum assessment."""

    factor_name: str
    impact: str = Field(..., description="'positive', 'neutral', or 'concerning'")
    description: str
    weight: float = Field(default=0.0, description="Relative influence on the prediction")


class StudentRiskPrediction(BaseModel):
    """Output for student learning-risk and pacing momentum estimation."""

    student_id: str
    risk_level: str = Field(..., description="'low', 'moderate', 'high', or 'insufficient_data'")
    risk_score: float = Field(..., ge=0.0, le=1.0, description="Calculated risk probability [0.0 - 1.0]")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Model certainty indicator")
    momentum_status: str = Field(..., description="'accelerating', 'steady', 'needs_attention', 'insufficient_data'")
    contributing_factors: list[ContributingFactor] = Field(default_factory=list)
    supportive_guidance: list[str] = Field(default_factory=list, description="Actionable encouragement and study advice")
    model_version: str = Field(default="v1.0.0", description="Active prediction model version")
    is_insufficient_data: bool = Field(default=False, description="Flag indicating new student cold-start")

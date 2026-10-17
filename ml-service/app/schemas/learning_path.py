from typing import Any

from pydantic import BaseModel, Field


class ActiveEnrollmentItem(BaseModel):
    course_id: str
    course_title: str
    completed_lessons: int
    total_lessons: int
    next_lesson_id: str | None = None
    next_lesson_title: str | None = None
    next_lesson_order: int = 1


class QuizPerformanceRecord(BaseModel):
    quiz_id: str
    quiz_title: str
    course_title: str
    percentage_score: float
    passed: bool


class CoursePrerequisiteCheck(BaseModel):
    prerequisite_name: str
    is_met: bool
    evidence: str


class SkillGapAlert(BaseModel):
    topic: str
    assessment_title: str
    score: float
    recommendation: str


class LearningPathRequest(BaseModel):
    student_id: str
    active_enrollments: list[ActiveEnrollmentItem] = Field(default_factory=list)
    completed_course_titles: list[str] = Field(default_factory=list)
    quiz_history: list[QuizPerformanceRecord] = Field(default_factory=list)
    available_courses: list[dict[str, Any]] = Field(default_factory=list)


class LearningPathStep(BaseModel):
    step_type: str = Field(..., description="'lesson_completion' or 'course_enrollment'")
    title: str
    description: str
    course_id: str | None = None
    course_title: str | None = None
    lesson_id: str | None = None
    lesson_title: str | None = None
    estimated_minutes: int = 15
    confidence_level: str = Field(default="high", description="'high', 'medium', or 'exploratory'")


class LearningPathResponse(BaseModel):
    student_id: str
    current_focus: str
    next_step: LearningPathStep
    prerequisite_checks: list[CoursePrerequisiteCheck] = Field(default_factory=list)
    skill_gaps: list[SkillGapAlert] = Field(default_factory=list)
    rationale: str

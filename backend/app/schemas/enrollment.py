import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from backend.app.schemas.course import CourseResponse


class EnrollmentCreate(BaseModel):
    """Payload to enroll in a course."""

    course_id: uuid.UUID = Field(..., description="ID of the course to enroll in")


class EnrollmentResponse(BaseModel):
    """Detailed response descriptor for an enrollment."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID
    status: str
    enrolled_at: datetime
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    course: CourseResponse | None = None
    progress_percentage: float = Field(0.0, description="Percentage of course completed (0.0 to 100.0)")
    completed_lessons_count: int = Field(0, description="Number of completed lessons")
    total_lessons_count: int = Field(0, description="Total eligible lessons in course")
    next_lesson_id: uuid.UUID | None = Field(None, description="Next incomplete lesson ID for resuming")


class EnrollmentListResponse(BaseModel):
    """Collection wrapper for user enrollments."""

    items: list[EnrollmentResponse]
    total: int

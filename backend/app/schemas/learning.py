import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LessonProgressUpdate(BaseModel):
    """Payload to update lesson progress state idempotently."""

    is_completed: bool = Field(True, description="Whether the lesson is marked completed")


class LessonProgressResponse(BaseModel):
    """Progress status for a single lesson."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    lesson_id: uuid.UUID
    course_id: uuid.UUID
    is_completed: bool
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CourseProgressResponse(BaseModel):
    """Aggregated course progress analytics."""

    course_id: uuid.UUID
    total_lessons: int
    completed_lessons: int
    progress_percentage: float
    completed_lesson_ids: list[uuid.UUID] = Field(default_factory=list)
    is_course_completed: bool = False


class LearningLessonResponse(BaseModel):
    """Lesson schema for the active learning view with student progress."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    module_id: uuid.UUID
    title: str
    description: str | None = None
    content_type: str
    text_content: str | None = None
    resource_url: str | None = None
    duration_minutes: int = 0
    order_index: int = 0
    is_preview: bool = False
    is_completed: bool = False
    completed_at: datetime | None = None


class LearningModuleResponse(BaseModel):
    """Module schema for the learning view with nested lessons."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str | None = None
    order_index: int = 0
    lessons: list[LearningLessonResponse] = Field(default_factory=list)
    completed_lessons_count: int = 0
    total_lessons_count: int = 0


class LearningCourseResponse(BaseModel):
    """Complete syllabus and progress view for an enrolled student."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    short_description: str
    description: str
    thumbnail_url: str | None = None
    difficulty: str
    duration_minutes: int
    learning_objectives: list[str] = Field(default_factory=list)
    prerequisites: list[str] = Field(default_factory=list)
    modules: list[LearningModuleResponse] = Field(default_factory=list)
    progress: CourseProgressResponse
    enrollment_status: str
    enrolled_at: datetime
    completed_at: datetime | None = None


class ResumeLearningResponse(BaseModel):
    """Descriptor for resuming learning at the next incomplete lesson."""

    course_id: uuid.UUID
    next_lesson_id: uuid.UUID | None = None
    next_lesson_title: str | None = None
    next_module_id: uuid.UUID | None = None
    is_completed: bool = False
    progress_percentage: float = 0.0
    completed_lessons: int = 0
    total_lessons: int = 0

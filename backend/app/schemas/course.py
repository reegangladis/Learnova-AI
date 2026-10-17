import re
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.models.course import (
    CourseDifficulty,
    LessonContentType,
)


def slugify(text: str) -> str:
    """Standard slug generation converting strings to kebab-case."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return re.sub(r"^-+|-+$", "", text)


# ---------------------------------------------------------------------------
# Course Category Schemas
# ---------------------------------------------------------------------------


class CourseCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Category name")
    slug: str | None = Field(
        None, max_length=255, description="Unique slug for the category"
    )
    description: str | None = Field(
        None, max_length=2000, description="Category description"
    )
    is_active: bool = Field(
        True, description="Whether this category is active and selectable"
    )


class CourseCategoryCreate(CourseCategoryBase):
    @field_validator("slug", mode="after")
    @classmethod
    def set_slug(cls, v: str | None, info: Any) -> str | None:
        if v:
            return slugify(v)
        return v


class CourseCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=2000)
    is_active: bool | None = None

    @field_validator("slug", mode="after")
    @classmethod
    def set_slug(cls, v: str | None) -> str | None:
        if v:
            return slugify(v)
        return v


class CourseCategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Lesson Schemas
# ---------------------------------------------------------------------------


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Lesson title")
    description: str | None = Field(None, description="Lesson overview")
    content_type: LessonContentType = Field(
        default=LessonContentType.TEXT, description="Type of learning content"
    )
    text_content: str | None = Field(
        None, description="Markdown/HTML body for text lessons"
    )
    resource_url: str | None = Field(
        None, max_length=1000, description="URL or reference to multimedia asset"
    )
    duration_minutes: int = Field(0, ge=0, description="Estimated duration in minutes")
    order_index: int | None = Field(
        None, ge=0, description="Explicit sort order within module"
    )
    is_preview: bool = Field(
        False, description="Whether this lesson is accessible without enrollment"
    )
    metadata_json: dict[str, Any] = Field(
        default_factory=dict, description="Extension metadata for Phase 7 RAG"
    )


class LessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    content_type: LessonContentType | None = None
    text_content: str | None = None
    resource_url: str | None = Field(None, max_length=1000)
    duration_minutes: int | None = Field(None, ge=0)
    order_index: int | None = Field(None, ge=0)
    is_preview: bool | None = None
    metadata_json: dict[str, Any] | None = None


class LessonReorderRequest(BaseModel):
    order_index: int = Field(
        ..., ge=0, description="Target zero-based order position"
    )


class LessonResponse(BaseModel):
    id: uuid.UUID
    module_id: uuid.UUID
    title: str
    description: str | None = None
    content_type: str
    text_content: str | None = None
    resource_url: str | None = None
    duration_minutes: int
    order_index: int
    is_preview: bool
    text_extraction_status: str
    content_processing_status: str
    last_processed_at: datetime | None = None
    metadata_json: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Module Schemas
# ---------------------------------------------------------------------------


class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Module title")
    description: str | None = Field(None, description="Module learning outcome summary")
    order_index: int | None = Field(
        None, ge=0, description="Explicit sort order within course"
    )


class ModuleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    order_index: int | None = Field(None, ge=0)


class ModuleReorderRequest(BaseModel):
    order_index: int = Field(
        ..., ge=0, description="Target zero-based order position"
    )


class ModuleResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    title: str
    description: str | None = None
    order_index: int
    lessons: list[LessonResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Course Schemas
# ---------------------------------------------------------------------------


class InstructorSummary(BaseModel):
    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    avatar_url: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Course title")
    slug: str | None = Field(
        None, max_length=255, description="URL-friendly slug (auto-generated if omitted)"
    )
    short_description: str = Field(
        ..., min_length=1, max_length=500, description="Brief catalog summary"
    )
    description: str = Field(..., min_length=1, description="Full markdown syllabus & overview")
    category_id: uuid.UUID | None = Field(
        None, description="Taxonomic category reference"
    )
    thumbnail_url: str | None = Field(
        None, max_length=500, description="Cover banner image reference"
    )
    difficulty: CourseDifficulty = Field(
        default=CourseDifficulty.BEGINNER, description="Target experience level"
    )
    duration_minutes: int = Field(0, ge=0, description="Estimated total minutes")
    learning_objectives: list[str] = Field(
        default_factory=list, description="List of learning outcomes"
    )
    prerequisites: list[str] = Field(
        default_factory=list, description="Prior knowledge required"
    )
    language: str = Field("en", max_length=50, description="Instructional language")

    @field_validator("slug", mode="after")
    @classmethod
    def set_slug(cls, v: str | None) -> str | None:
        if v:
            return slugify(v)
        return v


class CourseUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    slug: str | None = Field(None, max_length=255)
    short_description: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = Field(None, min_length=1)
    category_id: uuid.UUID | None = None
    thumbnail_url: str | None = Field(None, max_length=500)
    difficulty: CourseDifficulty | None = None
    duration_minutes: int | None = Field(None, ge=0)
    learning_objectives: list[str] | None = None
    prerequisites: list[str] | None = None
    language: str | None = Field(None, max_length=50)

    @field_validator("slug", mode="after")
    @classmethod
    def set_slug(cls, v: str | None) -> str | None:
        if v:
            return slugify(v)
        return v


class CourseResponse(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID | None = None
    instructor_id: uuid.UUID
    instructor: InstructorSummary | None = None
    category_id: uuid.UUID | None = None
    category: CourseCategoryResponse | None = None
    title: str
    slug: str
    short_description: str
    description: str
    thumbnail_url: str | None = None
    difficulty: str
    duration_minutes: int
    learning_objectives: list[str]
    prerequisites: list[str]
    status: str
    language: str
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    modules_count: int = 0
    lessons_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class CourseDetailResponse(CourseResponse):
    modules: list[ModuleResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CourseListResponse(BaseModel):
    items: list[CourseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

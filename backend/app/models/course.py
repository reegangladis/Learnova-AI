import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from backend.app.models.organization import Organization
    from backend.app.models.user import User


class CourseDifficulty(str, Enum):
    """Standard course difficulty levels."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class CourseStatus(str, Enum):
    """Course publication workflow statuses."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class LessonContentType(str, Enum):
    """Supported content types for modular lessons."""

    TEXT = "text"
    VIDEO = "video"
    PDF = "pdf"
    EXTERNAL_RESOURCE = "external_resource"


class ContentProcessingStatus(str, Enum):
    """AI RAG / Content processing status for Phase 7 readiness."""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CourseCategory(Base, UUIDMixin, TimestampMixin):
    """Taxonomic category for courses."""

    __tablename__ = "course_categories"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    courses: Mapped[list["Course"]] = relationship(
        "Course",
        back_populates="category",
        lazy="selectin",
    )


class Course(Base, UUIDMixin, TimestampMixin):
    """Core course entity for instructional content."""

    __tablename__ = "courses"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    short_description: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    difficulty: Mapped[str] = mapped_column(
        String(50), default=CourseDifficulty.BEGINNER.value, nullable=False
    )
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    learning_objectives: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    prerequisites: Mapped[list[str]] = mapped_column(
        JSON, default=list, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(50), default=CourseStatus.DRAFT.value, index=True, nullable=False
    )
    language: Mapped[str] = mapped_column(String(50), default="en", nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    instructor: Mapped["User"] = relationship("User", lazy="selectin")
    organization: Mapped["Organization | None"] = relationship(
        "Organization", lazy="selectin"
    )
    category: Mapped["CourseCategory | None"] = relationship(
        "CourseCategory", back_populates="courses", lazy="selectin"
    )
    modules: Mapped[list["CourseModule"]] = relationship(
        "CourseModule",
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="CourseModule.order_index",
        lazy="selectin",
    )


class CourseModule(Base, UUIDMixin, TimestampMixin):
    """Organizational module or chapter within a course."""

    __tablename__ = "course_modules"

    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )

    # Relationships
    course: Mapped["Course"] = relationship("Course", back_populates="modules")
    lessons: Mapped[list["Lesson"]] = relationship(
        "Lesson",
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="Lesson.order_index",
        lazy="selectin",
    )


class Lesson(Base, UUIDMixin, TimestampMixin):
    """Atomic instructional lesson entity supporting multimedia and future RAG pipelines."""

    __tablename__ = "lessons"

    module_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("course_modules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    content_type: Mapped[str] = mapped_column(
        String(50), default=LessonContentType.TEXT.value, nullable=False
    )
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    resource_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    order_index: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )
    is_preview: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # AI Pipeline & RAG Extension Points (Phase 7 readiness)
    text_extraction_status: Mapped[str] = mapped_column(
        String(50), default=ContentProcessingStatus.PENDING.value, nullable=False
    )
    content_processing_status: Mapped[str] = mapped_column(
        String(50), default=ContentProcessingStatus.PENDING.value, nullable=False
    )
    last_processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, nullable=False
    )

    # Relationships
    module: Mapped["CourseModule"] = relationship("CourseModule", back_populates="lessons")

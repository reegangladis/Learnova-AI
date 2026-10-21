import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from backend.app.models.course import Course, Lesson
    from backend.app.models.user import User


class EnrollmentStatus(str, Enum):
    """Lifecycle statuses for student course enrollment."""

    ACTIVE = "active"
    COMPLETED = "completed"
    DROPPED = "dropped"


class Enrollment(Base, UUIDMixin, TimestampMixin):
    """Student course enrollment entity."""

    __tablename__ = "enrollments"
    __table_args__ = (
        UniqueConstraint("user_id", "course_id", name="uq_enrollments_user_course"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=EnrollmentStatus.ACTIVE.value,
        nullable=False,
        index=True,
    )
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="selectin")
    course: Mapped["Course"] = relationship("Course", lazy="selectin")


class LessonProgress(Base, UUIDMixin, TimestampMixin):
    """Tracks atomic completion progress and video playback for a student on a specific lesson."""

    __tablename__ = "lesson_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "lesson_id", name="uq_lesson_progress_user_lesson"
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        index=True,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    playback_position_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    playback_duration_seconds: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )
    last_accessed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", lazy="selectin")
    lesson: Mapped["Lesson"] = relationship("Lesson", lazy="selectin")
    course: Mapped["Course"] = relationship("Course", lazy="selectin")

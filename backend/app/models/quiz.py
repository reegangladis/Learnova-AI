import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from backend.app.models.course import Course, Lesson
    from backend.app.models.organization import Organization
    from backend.app.models.user import User


class QuizStatus(str, Enum):
    """Lifecycle statuses for a quiz."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class QuestionType(str, Enum):
    """Supported question types for assessments."""

    SINGLE_CHOICE = "single_choice"
    TRUE_FALSE = "true_false"
    MULTIPLE_SELECT = "multiple_select"


class AttemptStatus(str, Enum):
    """Lifecycle statuses for student quiz attempts."""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    EXPIRED = "expired"


class Quiz(Base, UUIDMixin, TimestampMixin):
    """Quiz assessment entity associated with a course and optional lesson."""

    __tablename__ = "quizzes"

    organization_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("courses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lesson_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lessons.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    instructor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # 0 = untimed
    passing_score_percentage: Mapped[float] = mapped_column(Float, default=70.0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 0 = unlimited
    shuffle_questions: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    shuffle_options: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=QuizStatus.DRAFT.value, index=True, nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    course: Mapped["Course"] = relationship("Course", lazy="selectin")
    lesson: Mapped["Lesson | None"] = relationship("Lesson", lazy="selectin")
    instructor: Mapped["User"] = relationship("User", lazy="selectin")
    organization: Mapped["Organization | None"] = relationship(
        "Organization", lazy="selectin"
    )
    questions: Mapped[list["QuizQuestion"]] = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.order_index",
        lazy="selectin",
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(
        "QuizAttempt",
        back_populates="quiz",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class QuizQuestion(Base, UUIDMixin, TimestampMixin):
    """Atomic question within a quiz."""

    __tablename__ = "quiz_questions"

    quiz_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(
        String(50), default=QuestionType.SINGLE_CHOICE.value, nullable=False
    )
    order_index: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, index=True
    )
    points: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="questions")
    options: Mapped[list["QuestionOption"]] = relationship(
        "QuestionOption",
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuestionOption.order_index",
        lazy="selectin",
    )


class QuestionOption(Base, UUIDMixin, TimestampMixin):
    """Selectable answer option for a quiz question."""

    __tablename__ = "question_options"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    option_text: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    question: Mapped["QuizQuestion"] = relationship(
        "QuizQuestion", back_populates="options"
    )


class QuizAttempt(Base, UUIDMixin, TimestampMixin):
    """Record of a student undertaking a quiz assessment."""

    __tablename__ = "quiz_attempts"
    __table_args__ = (
        UniqueConstraint(
            "quiz_id", "user_id", "attempt_number", name="uq_quiz_attempts_quiz_user_attempt"
        ),
    )

    quiz_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quizzes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), default=AttemptStatus.IN_PROGRESS.value, index=True, nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    percentage_score: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Relationships
    quiz: Mapped["Quiz"] = relationship("Quiz", back_populates="attempts", lazy="selectin")
    user: Mapped["User"] = relationship("User", lazy="selectin")
    answers: Mapped[list["QuizAnswer"]] = relationship(
        "QuizAnswer",
        back_populates="attempt",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class QuizAnswer(Base, UUIDMixin, TimestampMixin):
    """Student's recorded response for a question in a specific quiz attempt."""

    __tablename__ = "quiz_answers"
    __table_args__ = (
        UniqueConstraint(
            "attempt_id", "question_id", name="uq_quiz_answers_attempt_question"
        ),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quiz_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    selected_option_ids: Mapped[list[Any]] = mapped_column(
        JSON, default=list, nullable=False
    )
    text_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    points_awarded: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    # Relationships
    attempt: Mapped["QuizAttempt"] = relationship("QuizAttempt", back_populates="answers")
    question: Mapped["QuizQuestion"] = relationship("QuizQuestion", lazy="selectin")

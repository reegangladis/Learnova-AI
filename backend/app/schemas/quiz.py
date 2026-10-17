import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class QuizStatusEnum(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class QuestionTypeEnum(str, Enum):
    SINGLE_CHOICE = "single_choice"
    TRUE_FALSE = "true_false"
    MULTIPLE_SELECT = "multiple_select"


class AttemptStatusEnum(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    EXPIRED = "expired"


# ============================================================================
# Option Schemas
# ============================================================================


class QuestionOptionBase(BaseModel):
    option_text: str = Field(..., min_length=1, max_length=2000)
    order_index: int = Field(default=0, ge=0)
    is_correct: bool = Field(default=False)
    explanation: str | None = Field(default=None, max_length=2000)


class QuestionOptionCreate(QuestionOptionBase):
    pass


class QuestionOptionUpdate(BaseModel):
    id: uuid.UUID | None = None
    option_text: str | None = Field(default=None, min_length=1, max_length=2000)
    order_index: int | None = Field(default=None, ge=0)
    is_correct: bool | None = None
    explanation: str | None = Field(default=None, max_length=2000)


class QuestionOptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    option_text: str
    order_index: int
    is_correct: bool
    explanation: str | None = None
    created_at: datetime
    updated_at: datetime


class StudentQuestionOptionResponse(BaseModel):
    """Option representation for active quiz taking - excludes correctness and explanation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    option_text: str
    order_index: int


# ============================================================================
# Question Schemas
# ============================================================================


class QuizQuestionBase(BaseModel):
    question_text: str = Field(..., min_length=1)
    question_type: QuestionTypeEnum = Field(default=QuestionTypeEnum.SINGLE_CHOICE)
    order_index: int = Field(default=0, ge=0)
    points: int = Field(default=1, ge=1)
    explanation: str | None = Field(default=None, max_length=5000)
    is_required: bool = Field(default=True)


class QuizQuestionCreate(QuizQuestionBase):
    options: list[QuestionOptionCreate] = Field(
        default_factory=list,
        description="List of options for this question",
    )


class QuizQuestionUpdate(BaseModel):
    question_text: str | None = Field(default=None, min_length=1)
    question_type: QuestionTypeEnum | None = None
    order_index: int | None = Field(default=None, ge=0)
    points: int | None = Field(default=None, ge=1)
    explanation: str | None = Field(default=None, max_length=5000)
    is_required: bool | None = None
    options: list[QuestionOptionCreate] | None = None


class QuizQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quiz_id: uuid.UUID
    question_text: str
    question_type: str
    order_index: int
    points: int
    explanation: str | None = None
    is_required: bool
    options: list[QuestionOptionResponse]
    created_at: datetime
    updated_at: datetime


class StudentQuizQuestionResponse(BaseModel):
    """Question representation for active student taking - stripped of answers."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    quiz_id: uuid.UUID
    question_text: str
    question_type: str
    order_index: int
    points: int
    is_required: bool
    options: list[StudentQuestionOptionResponse]


class QuizReorderQuestionsRequest(BaseModel):
    question_ids: list[uuid.UUID] = Field(..., min_length=1)


# ============================================================================
# Quiz Schemas
# ============================================================================


class QuizBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    instructions: str | None = Field(default=None, max_length=5000)
    duration_minutes: int = Field(
        default=0, ge=0, description="0 indicates untimed assessment"
    )
    passing_score_percentage: float = Field(default=70.0, ge=0.0, le=100.0)
    max_attempts: int = Field(
        default=1, ge=0, description="0 indicates unlimited attempts"
    )
    shuffle_questions: bool = Field(default=False)
    shuffle_options: bool = Field(default=False)


class QuizCreate(QuizBase):
    course_id: uuid.UUID
    lesson_id: uuid.UUID | None = None


class QuizUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    lesson_id: uuid.UUID | None = None
    description: str | None = Field(default=None, max_length=5000)
    instructions: str | None = Field(default=None, max_length=5000)
    duration_minutes: int | None = Field(default=None, ge=0)
    passing_score_percentage: float | None = Field(default=None, ge=0.0, le=100.0)
    max_attempts: int | None = Field(default=None, ge=0)
    shuffle_questions: bool | None = None
    shuffle_options: bool | None = None


class QuizResponse(QuizBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID | None = None
    course_id: uuid.UUID
    lesson_id: uuid.UUID | None = None
    instructor_id: uuid.UUID
    status: str
    published_at: datetime | None = None
    archived_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class QuizDetailResponse(QuizResponse):
    questions: list[QuizQuestionResponse] = []
    total_points: int = 0
    question_count: int = 0


# ============================================================================
# Student Assessment & Taking Schemas
# ============================================================================


class StudentQuizTakeResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    lesson_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    instructions: str | None = None
    duration_minutes: int
    passing_score_percentage: float
    max_attempts: int
    total_points: int
    question_count: int
    active_attempt_id: uuid.UUID | None = None
    time_remaining_seconds: int | None = None
    questions: list[StudentQuizQuestionResponse]


class QuizAttemptStartResponse(BaseModel):
    id: uuid.UUID
    quiz_id: uuid.UUID
    attempt_number: int
    status: str
    started_at: datetime
    duration_minutes: int
    time_remaining_seconds: int | None = None


class QuizAnswerSaveRequest(BaseModel):
    selected_option_ids: list[uuid.UUID] = Field(default_factory=list)
    text_response: str | None = None


class QuizAnswerSaveResponse(BaseModel):
    question_id: uuid.UUID
    selected_option_ids: list[uuid.UUID]
    saved: bool = True
    saved_at: datetime


class QuestionResultResponse(BaseModel):
    question_id: uuid.UUID
    question_text: str
    question_type: str
    order_index: int
    points_possible: int
    points_awarded: float
    is_correct: bool
    selected_option_ids: list[uuid.UUID]
    correct_option_ids: list[uuid.UUID]
    options: list[QuestionOptionResponse]
    explanation: str | None = None


class QuizResultResponse(BaseModel):
    attempt_id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    attempt_number: int
    status: str
    started_at: datetime
    submitted_at: datetime | None = None
    time_spent_seconds: int | None = None
    score: float
    max_score: float
    percentage_score: float
    passed: bool
    passing_score_percentage: float
    can_retake: bool
    attempts_remaining: int | None = None
    question_results: list[QuestionResultResponse] = []


class StudentQuizAttemptSummary(BaseModel):
    id: uuid.UUID
    attempt_number: int
    status: str
    started_at: datetime
    submitted_at: datetime | None = None
    score: float
    max_score: float
    percentage_score: float
    passed: bool
    time_spent_seconds: int | None = None


class StudentCourseQuizItemResponse(BaseModel):
    id: uuid.UUID
    course_id: uuid.UUID
    lesson_id: uuid.UUID | None = None
    title: str
    description: str | None = None
    duration_minutes: int
    passing_score_percentage: float
    max_attempts: int
    question_count: int
    total_points: int
    attempts_count: int
    best_score_percentage: float | None = None
    is_passed: bool = False
    can_attempt: bool = True
    active_attempt_id: uuid.UUID | None = None

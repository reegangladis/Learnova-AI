import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

# ============================================================================
# Shared Sub-Schemas
# ============================================================================


class RoleCountItem(BaseModel):
    role: str
    count: int


class DateMetricItem(BaseModel):
    date: str  # YYYY-MM-DD
    count: int = 0


# ============================================================================
# Student Analytics Schemas
# ============================================================================


class StudentResumeCourseItem(BaseModel):
    course_id: uuid.UUID
    course_title: str
    thumbnail_url: str | None = None
    progress_percentage: float = 0.0
    completed_lessons: int = 0
    total_lessons: int = 0
    next_lesson_id: uuid.UUID | None = None
    next_lesson_title: str | None = None


class StudentOverviewResponse(BaseModel):
    total_enrolled_courses: int = 0
    courses_in_progress: int = 0
    courses_completed: int = 0
    courses_dropped: int = 0
    overall_learning_progress: float = 0.0
    total_lessons_count: int = 0
    completed_lessons_count: int = 0
    remaining_lessons_count: int = 0
    total_quiz_attempts: int = 0
    passed_quiz_attempts: int = 0
    average_quiz_score: float = 0.0
    quiz_pass_rate: float = 0.0
    total_time_spent_minutes: int = 0
    resume_courses: list[StudentResumeCourseItem] = Field(default_factory=list)


class StudentRecentActivityItem(BaseModel):
    id: uuid.UUID
    activity_type: str  # "lesson_completion", "quiz_attempt", "course_enrollment"
    title: str
    subtitle: str
    timestamp: datetime
    status: str | None = None
    score: float | None = None
    course_id: uuid.UUID | None = None
    course_title: str | None = None


class StudentProgressTrendItem(BaseModel):
    date: str  # YYYY-MM-DD
    lessons_completed: int = 0
    quizzes_completed: int = 0


class StudentActivityResponse(BaseModel):
    recent_activities: list[StudentRecentActivityItem] = Field(default_factory=list)
    progress_trends: list[StudentProgressTrendItem] = Field(default_factory=list)


class StudentAssessmentResultItem(BaseModel):
    attempt_id: uuid.UUID
    quiz_id: uuid.UUID
    quiz_title: str
    course_id: uuid.UUID
    course_title: str
    attempt_number: int
    score: float
    max_score: float
    percentage_score: float
    passed: bool
    time_spent_seconds: int | None = None
    submitted_at: datetime | None = None


class StudentAssessmentsResponse(BaseModel):
    total_attempts: int = 0
    passed_attempts: int = 0
    average_score: float = 0.0
    pass_rate: float = 0.0
    results: list[StudentAssessmentResultItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


# ============================================================================
# Instructor Analytics Schemas
# ============================================================================


class InstructorTrendItem(BaseModel):
    date: str  # YYYY-MM-DD
    enrollments: int = 0
    completions: int = 0
    quiz_attempts: int = 0


class InstructorOverviewResponse(BaseModel):
    total_courses: int = 0
    published_courses: int = 0
    draft_courses: int = 0
    archived_courses: int = 0
    total_enrollments: int = 0
    active_enrollments: int = 0
    completed_enrollments: int = 0
    dropped_enrollments: int = 0
    unique_students: int = 0
    course_completion_rate: float = 0.0
    total_lessons: int = 0
    total_lesson_completions: int = 0
    student_lesson_progress_rate: float = 0.0
    total_quizzes: int = 0
    total_quiz_attempts: int = 0
    average_quiz_score: float = 0.0
    quiz_pass_rate: float = 0.0
    trends: list[InstructorTrendItem] = Field(default_factory=list)


class InstructorCourseComparisonItem(BaseModel):
    course_id: uuid.UUID
    title: str
    status: str
    difficulty: str
    total_lessons: int = 0
    total_enrollments: int = 0
    active_enrollments: int = 0
    completed_enrollments: int = 0
    dropped_enrollments: int = 0
    completion_rate: float = 0.0
    total_quiz_attempts: int = 0
    average_quiz_score: float = 0.0
    quiz_pass_rate: float = 0.0
    created_at: datetime
    published_at: datetime | None = None


class InstructorCoursesResponse(BaseModel):
    courses: list[InstructorCourseComparisonItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


class InstructorScoreDistribution(BaseModel):
    range_0_50: int = 0
    range_51_70: int = 0
    range_71_85: int = 0
    range_86_100: int = 0


class InstructorAssessmentItem(BaseModel):
    quiz_id: uuid.UUID
    title: str
    course_id: uuid.UUID
    course_title: str
    passing_score_percentage: float = 70.0
    status: str
    total_attempts: int = 0
    unique_participants: int = 0
    passed_attempts: int = 0
    pass_rate: float = 0.0
    average_score: float = 0.0
    highest_score: float = 0.0
    lowest_score: float = 0.0
    average_time_spent_seconds: float | None = None
    score_distribution: InstructorScoreDistribution = Field(
        default_factory=InstructorScoreDistribution
    )


class InstructorAssessmentsResponse(BaseModel):
    assessments: list[InstructorAssessmentItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


# ============================================================================
# Administrator Analytics Schemas
# ============================================================================


class AdminRecentActivityItem(BaseModel):
    id: uuid.UUID
    event_type: str
    description: str
    user_id: uuid.UUID | None = None
    user_email: str | None = None
    timestamp: datetime
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class AdminTrendItem(BaseModel):
    date: str  # YYYY-MM-DD
    new_users: int = 0
    new_enrollments: int = 0
    completions: int = 0


class AdminOverviewResponse(BaseModel):
    organization_id: uuid.UUID | None = None
    organization_name: str | None = None
    total_users: int = 0
    active_users: int = 0
    inactive_users: int = 0
    users_by_role: list[RoleCountItem] = Field(default_factory=list)
    total_courses: int = 0
    published_courses: int = 0
    draft_courses: int = 0
    archived_courses: int = 0
    total_enrollments: int = 0
    active_enrollments: int = 0
    completed_enrollments: int = 0
    dropped_enrollments: int = 0
    overall_completion_rate: float = 0.0
    total_quiz_attempts: int = 0
    average_quiz_score: float = 0.0
    quiz_pass_rate: float = 0.0
    recent_activity: list[AdminRecentActivityItem] = Field(default_factory=list)
    trends: list[AdminTrendItem] = Field(default_factory=list)


class AdminUserAnalyticsItem(BaseModel):
    user_id: uuid.UUID
    email: str
    first_name: str
    last_name: str
    roles: list[str] = Field(default_factory=list)
    is_active: bool
    is_verified: bool
    enrolled_courses_count: int = 0
    completed_courses_count: int = 0
    created_at: datetime
    last_login_at: datetime | None = None


class AdminUsersResponse(BaseModel):
    total_users: int = 0
    active_users: int = 0
    inactive_users: int = 0
    users_by_role: list[RoleCountItem] = Field(default_factory=list)
    users: list[AdminUserAnalyticsItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


class AdminCourseAnalyticsItem(BaseModel):
    course_id: uuid.UUID
    title: str
    instructor_name: str
    instructor_email: str
    category_name: str | None = None
    status: str
    difficulty: str
    total_enrollments: int = 0
    completed_enrollments: int = 0
    completion_rate: float = 0.0
    total_lessons: int = 0
    average_quiz_score: float = 0.0
    created_at: datetime


class AdminCoursesResponse(BaseModel):
    total_courses: int = 0
    published_courses: int = 0
    draft_courses: int = 0
    archived_courses: int = 0
    courses: list[AdminCourseAnalyticsItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20


class AdminEnrollmentItem(BaseModel):
    enrollment_id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    course_id: uuid.UUID
    course_title: str
    status: str
    progress_percentage: float = 0.0
    enrolled_at: datetime
    completed_at: datetime | None = None


class AdminEnrollmentsResponse(BaseModel):
    total_enrollments: int = 0
    active_enrollments: int = 0
    completed_enrollments: int = 0
    dropped_enrollments: int = 0
    completion_rate: float = 0.0
    enrollments: list[AdminEnrollmentItem] = Field(default_factory=list)
    trends: list[AdminTrendItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 20

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from backend.app.api.deps import (
    get_analytics_service,
    get_current_user,
    require_role,
)
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    AdminCoursesResponse,
    AdminEnrollmentsResponse,
    AdminOverviewResponse,
    AdminUsersResponse,
    InstructorAssessmentsResponse,
    InstructorCoursesResponse,
    InstructorOverviewResponse,
    StudentActivityResponse,
    StudentAssessmentsResponse,
    StudentOverviewResponse,
)
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Role-Based Analytics & Insights"])


# ============================================================================
# 1. Student Analytics Endpoints
# ============================================================================


@router.get(
    "/student/overview",
    response_model=StudentOverviewResponse,
    summary="Retrieve personalized student learning overview and KPI metrics",
)
async def get_student_overview(
    current_user: Annotated[User, Depends(get_current_user)],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    days: Annotated[int, Query(ge=1, le=365, description="Lookback window in days")] = 30,
) -> StudentOverviewResponse:
    """Returns total enrolled courses, active/completed counts, lesson completion percentages,

    quiz pass rates, average scores, and active resume learning courses.
    """
    return await analytics_service.get_student_overview(
        current_user=current_user, days=days
    )


@router.get(
    "/student/activity",
    response_model=StudentActivityResponse,
    summary="Retrieve real student learning activity stream and configurable progress trends",
)
async def get_student_activity(
    current_user: Annotated[User, Depends(get_current_user)],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    days: Annotated[int, Query(ge=1, le=365, description="Trend lookback duration")] = 30,
    limit: Annotated[int, Query(ge=1, le=100, description="Max recent activity events")] = 15,
) -> StudentActivityResponse:
    """Returns actual recorded chronological learning events (lesson completions, quiz submissions,

    and enrollments) alongside daily completion trend telemetry.
    """
    return await analytics_service.get_student_activity(
        current_user=current_user, days=days, limit=limit
    )


@router.get(
    "/student/assessments",
    response_model=StudentAssessmentsResponse,
    summary="Retrieve authenticated student's finalized quiz attempts and assessment statistics",
)
async def get_student_assessments(
    current_user: Annotated[User, Depends(get_current_user)],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    course_id: Annotated[uuid.UUID | None, Query(description="Optional course filter")] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> StudentAssessmentsResponse:
    """Calculates assessment pass rate and average score, and returns paginated finalized attempts.

    Unfinished attempts in progress are strictly excluded from score aggregations.
    """
    return await analytics_service.get_student_assessments(
        current_user=current_user,
        course_id=course_id,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# 2. Instructor Analytics Endpoints
# ============================================================================


@router.get(
    "/instructor/overview",
    response_model=InstructorOverviewResponse,
    summary="Retrieve instructor performance analytics restricted to owned courses",
)
async def get_instructor_overview(
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    course_id: Annotated[uuid.UUID | None, Query(description="Optional course filter")] = None,
    organization_id: Annotated[uuid.UUID | None, Query(description="Optional organization filter")] = None,
    days: Annotated[int, Query(ge=1, le=365, description="Lookback window in days")] = 30,
) -> InstructorOverviewResponse:
    """Calculates enrollment counts, completion rates, lesson progress stats, quiz participation,

    and assessment pass rates strictly scoped to courses owned by the authenticated instructor.
    """
    return await analytics_service.get_instructor_overview(
        current_user=current_user,
        course_id=course_id,
        organization_id=organization_id,
        days=days,
    )


@router.get(
    "/instructor/courses",
    response_model=InstructorCoursesResponse,
    summary="Retrieve per-course comparative analytics for instructor's catalog",
)
async def get_instructor_courses(
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    organization_id: Annotated[uuid.UUID | None, Query(description="Optional organization filter")] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    search: Annotated[str | None, Query(description="Search course title")] = None,
) -> InstructorCoursesResponse:
    """Returns course-by-course enrollment volume, completion rate, lesson count, and average quiz scores."""
    return await analytics_service.get_instructor_courses(
        current_user=current_user,
        organization_id=organization_id,
        page=page,
        page_size=page_size,
        search=search,
    )


@router.get(
    "/instructor/assessments",
    response_model=InstructorAssessmentsResponse,
    summary="Retrieve quiz performance and score distributions for instructor's quizzes",
)
async def get_instructor_assessments(
    current_user: Annotated[
        User, Depends(require_role("INSTRUCTOR", "ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    course_id: Annotated[uuid.UUID | None, Query(description="Filter by course")] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> InstructorAssessmentsResponse:
    """Returns assessment metrics, participant counts, pass rates, score ranges, and quartile score distributions."""
    return await analytics_service.get_instructor_assessments(
        current_user=current_user,
        course_id=course_id,
        page=page,
        page_size=page_size,
    )


# ============================================================================
# 3. Administrator Analytics Endpoints
# ============================================================================


@router.get(
    "/admin/overview",
    response_model=AdminOverviewResponse,
    summary="Retrieve organization-scoped administrative system analytics",
)
async def get_admin_overview(
    current_user: Annotated[
        User, Depends(require_role("ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    organization_id: Annotated[
        uuid.UUID | None,
        Query(
            description="Organization filter (Super Admin only; regular Admins scoped automatically)"
        ),
    ] = None,
    days: Annotated[int, Query(ge=1, le=365, description="Lookback window in days")] = 30,
) -> AdminOverviewResponse:
    """Provides organization-scoped user counts by role, active courses, enrollment breakdown,

    aggregate completion rates, assessment metrics, recent audit log events, and trend telemetry.
    """
    return await analytics_service.get_admin_overview(
        current_user=current_user,
        organization_id=organization_id,
        days=days,
    )


@router.get(
    "/admin/users",
    response_model=AdminUsersResponse,
    summary="Retrieve organization-scoped user demographics and activity analytics",
)
async def get_admin_users(
    current_user: Annotated[
        User, Depends(require_role("ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    organization_id: Annotated[
        uuid.UUID | None,
        Query(description="Organization filter (Super Admin only)"),
    ] = None,
    role: Annotated[str | None, Query(description="Filter by role name")] = None,
    search: Annotated[str | None, Query(description="Search name or email")] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> AdminUsersResponse:
    """Returns role counts, active/inactive user breakdown, and paginated user records with enrollment totals."""
    return await analytics_service.get_admin_users(
        current_user=current_user,
        organization_id=organization_id,
        role=role,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/admin/courses",
    response_model=AdminCoursesResponse,
    summary="Retrieve organization-scoped course catalog analytics and completion metrics",
)
async def get_admin_courses(
    current_user: Annotated[
        User, Depends(require_role("ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    organization_id: Annotated[
        uuid.UUID | None,
        Query(description="Organization filter (Super Admin only)"),
    ] = None,
    status: Annotated[str | None, Query(description="Course publication status")] = None,
    search: Annotated[str | None, Query(description="Search course title")] = None,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> AdminCoursesResponse:
    """Returns course publication status totals and paginated course items with enrollment counts and pass rates."""
    return await analytics_service.get_admin_courses(
        current_user=current_user,
        organization_id=organization_id,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/admin/enrollments",
    response_model=AdminEnrollmentsResponse,
    summary="Retrieve organization-scoped enrollment statistics and student progress logs",
)
async def get_admin_enrollments(
    current_user: Annotated[
        User, Depends(require_role("ADMIN", "SUPER_ADMIN"))
    ],
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    organization_id: Annotated[
        uuid.UUID | None,
        Query(description="Organization filter (Super Admin only)"),
    ] = None,
    status: Annotated[str | None, Query(description="Filter by enrollment status")] = None,
    course_id: Annotated[uuid.UUID | None, Query(description="Filter by course ID")] = None,
    days: Annotated[int, Query(ge=1, le=365, description="Lookback window in days")] = 30,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> AdminEnrollmentsResponse:
    """Returns aggregate status distribution, enrollment trend telemetry, and paginated enrollment progress items."""
    return await analytics_service.get_admin_enrollments(
        current_user=current_user,
        organization_id=organization_id,
        status=status,
        course_id=course_id,
        days=days,
        page=page,
        page_size=page_size,
    )

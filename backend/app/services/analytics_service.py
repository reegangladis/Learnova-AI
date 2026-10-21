import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.errors import AppExceptions
from backend.app.models.course import Course
from backend.app.models.user import User
from backend.app.repositories.analytics_repo import AnalyticsRepository
from backend.app.schemas.analytics import (
    AdminCourseAnalyticsItem,
    AdminCoursesResponse,
    AdminEnrollmentItem,
    AdminEnrollmentsResponse,
    AdminOverviewResponse,
    AdminRecentActivityItem,
    AdminTrendItem,
    AdminUserAnalyticsItem,
    AdminUsersResponse,
    InstructorAssessmentItem,
    InstructorAssessmentsResponse,
    InstructorCourseComparisonItem,
    InstructorCoursesResponse,
    InstructorOverviewResponse,
    InstructorScoreDistribution,
    InstructorTrendItem,
    RoleCountItem,
    StudentActivityResponse,
    StudentAssessmentResultItem,
    StudentAssessmentsResponse,
    StudentOverviewResponse,
    StudentProgressTrendItem,
    StudentRecentActivityItem,
    StudentResumeCourseItem,
)


class AnalyticsService:
    """Service managing role-based analytics calculations, data aggregation, and tenant security."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.analytics_repo = AnalyticsRepository(db)

    def _get_scoped_org_id(
        self, current_user: User, requested_org_id: uuid.UUID | None
    ) -> uuid.UUID | None:
        """Enforces tenant isolation: SUPER_ADMIN can view all or specify org; ADMIN is strictly bound to their org."""
        user_roles = {r.upper() for r in current_user.role_names}
        if "SUPER_ADMIN" in user_roles:
            return requested_org_id

        # Regular ADMIN or other roles cannot view cross-tenant data
        user_org_id = current_user.organization_id
        if requested_org_id and requested_org_id != user_org_id:
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: You cannot view analytics for another organization."
            )
        return user_org_id

    # ========================================================================
    # Student Analytics
    # ========================================================================

    async def get_student_overview(
        self, current_user: User, days: int = 30
    ) -> StudentOverviewResponse:
        """Returns personalized learning overview for the authenticated student."""
        enr_summary = await self.analytics_repo.get_student_enrollments_summary(current_user.id)
        les_summary = await self.analytics_repo.get_student_lessons_summary(current_user.id)
        quiz_summary = await self.analytics_repo.get_student_quizzes_summary(current_user.id)
        resume_courses_raw = await self.analytics_repo.get_student_resume_courses(current_user.id)

        # Progress calculation: completed / total eligible lessons * 100
        total_lessons = les_summary["total_lessons"]
        completed_lessons = les_summary["completed_lessons"]
        overall_progress = (
            (completed_lessons / total_lessons * 100.0) if total_lessons > 0 else 0.0
        )

        resume_courses = [
            StudentResumeCourseItem(**item) for item in resume_courses_raw
        ]

        return StudentOverviewResponse(
            total_enrolled_courses=enr_summary["total"],
            courses_in_progress=enr_summary["active"],
            courses_completed=enr_summary["completed"],
            courses_dropped=enr_summary["dropped"],
            overall_learning_progress=round(overall_progress, 1),
            total_lessons_count=total_lessons,
            completed_lessons_count=completed_lessons,
            remaining_lessons_count=les_summary["remaining_lessons"],
            total_quiz_attempts=int(quiz_summary["total_attempts"]),
            passed_quiz_attempts=int(quiz_summary["passed_attempts"]),
            average_quiz_score=float(quiz_summary["average_score"]),
            quiz_pass_rate=float(quiz_summary["pass_rate"]),
            total_time_spent_minutes=int(quiz_summary["time_spent_minutes"]),
            resume_courses=resume_courses,
        )

    async def get_student_activity(
        self, current_user: User, days: int = 30, limit: int = 15
    ) -> StudentActivityResponse:
        """Returns recent learning activity stream and configurable progress trends."""
        activities_raw = await self.analytics_repo.get_student_recent_activities(
            current_user.id, limit=limit
        )
        trends_raw = await self.analytics_repo.get_student_progress_trends(
            current_user.id, days=days
        )

        recent_activities = [
            StudentRecentActivityItem(**act) for act in activities_raw
        ]
        progress_trends = [
            StudentProgressTrendItem(**tr) for tr in trends_raw
        ]

        return StudentActivityResponse(
            recent_activities=recent_activities,
            progress_trends=progress_trends,
        )

    async def get_student_assessments(
        self,
        current_user: User,
        course_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> StudentAssessmentsResponse:
        """Returns student assessment history and summary metrics, excluding unfinished attempts."""
        quiz_summary = await self.analytics_repo.get_student_quizzes_summary(current_user.id)
        results_raw, total = await self.analytics_repo.get_student_assessments_list(
            user_id=current_user.id,
            course_id=course_id,
            page=page,
            page_size=page_size,
        )

        results = [
            StudentAssessmentResultItem(**r) for r in results_raw
        ]

        return StudentAssessmentsResponse(
            total_attempts=int(quiz_summary["total_attempts"]),
            passed_attempts=int(quiz_summary["passed_attempts"]),
            average_score=float(quiz_summary["average_score"]),
            pass_rate=float(quiz_summary["pass_rate"]),
            results=results,
            total=total,
            page=page,
            page_size=page_size,
        )

    # ========================================================================
    # Instructor Analytics
    # ========================================================================

    async def get_instructor_overview(
        self,
        current_user: User,
        course_id: uuid.UUID | None = None,
        organization_id: uuid.UUID | None = None,
        days: int = 30,
    ) -> InstructorOverviewResponse:
        """Returns analytics strictly isolated to courses owned by the authenticated instructor,
        with optional course_id and organization_id filters."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"INSTRUCTOR", "ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires INSTRUCTOR, ADMIN, or SUPER_ADMIN role."
            )

        target_org_id = self._get_scoped_org_id(current_user, organization_id)

        if course_id is not None:
            course = await self.db.get(Course, course_id)
            if not course:
                raise AppExceptions.NotFoundException(resource="Course", identifier=str(course_id))
            if "ADMIN" not in user_roles and "SUPER_ADMIN" not in user_roles:
                if course.instructor_id != current_user.id:
                    raise AppExceptions.ForbiddenException(
                        message="Access forbidden: You can only view analytics for courses you instruct."
                    )

        data = await self.analytics_repo.get_instructor_overview_stats(
            instructor_id=current_user.id,
            course_id=course_id,
            organization_id=target_org_id,
            days=days,
        )

        trends = [InstructorTrendItem(**t) for t in data["trends"]]

        return InstructorOverviewResponse(
            total_courses=data["total_courses"],
            published_courses=data["published_courses"],
            draft_courses=data["draft_courses"],
            archived_courses=data["archived_courses"],
            total_enrollments=data["total_enrollments"],
            active_enrollments=data["active_enrollments"],
            completed_enrollments=data["completed_enrollments"],
            dropped_enrollments=data["dropped_enrollments"],
            unique_students=data["unique_students"],
            course_completion_rate=data["course_completion_rate"],
            total_lessons=data["total_lessons"],
            total_lesson_completions=data["total_lesson_completions"],
            student_lesson_progress_rate=data["student_lesson_progress_rate"],
            total_quizzes=data["total_quizzes"],
            total_quiz_attempts=data["total_quiz_attempts"],
            average_quiz_score=data["average_quiz_score"],
            quiz_pass_rate=data["quiz_pass_rate"],
            trends=trends,
            course_id=data.get("course_id"),
            organization_id=data.get("organization_id"),
        )

    async def get_instructor_courses(
        self,
        current_user: User,
        organization_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> InstructorCoursesResponse:
        """Returns per-course comparison analytics for the authenticated instructor."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"INSTRUCTOR", "ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires INSTRUCTOR, ADMIN, or SUPER_ADMIN role."
            )

        target_org_id = self._get_scoped_org_id(current_user, organization_id)

        items_raw, total = await self.analytics_repo.get_instructor_course_comparisons(
            instructor_id=current_user.id,
            organization_id=target_org_id,
            page=page,
            page_size=page_size,
            search=search,
        )

        courses = [InstructorCourseComparisonItem(**item) for item in items_raw]

        return InstructorCoursesResponse(
            courses=courses,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_instructor_assessments(
        self,
        current_user: User,
        course_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> InstructorAssessmentsResponse:
        """Returns quiz performance, pass rates, and score distributions for instructor's courses."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"INSTRUCTOR", "ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires INSTRUCTOR, ADMIN, or SUPER_ADMIN role."
            )

        if course_id is not None:
            course = await self.db.get(Course, course_id)
            if not course:
                raise AppExceptions.NotFoundException(resource="Course", identifier=str(course_id))
            if "ADMIN" not in user_roles and "SUPER_ADMIN" not in user_roles:
                if course.instructor_id != current_user.id:
                    raise AppExceptions.ForbiddenException(
                        message="Access forbidden: You can only view analytics for courses you instruct."
                    )

        items_raw, total = await self.analytics_repo.get_instructor_assessments_detail(
            instructor_id=current_user.id,
            course_id=course_id,
            page=page,
            page_size=page_size,
        )

        assessments = []
        for item in items_raw:
            dist = item["score_distribution"]
            assessments.append(
                InstructorAssessmentItem(
                    quiz_id=item["quiz_id"],
                    title=item["title"],
                    course_id=item["course_id"],
                    course_title=item["course_title"],
                    passing_score_percentage=item["passing_score_percentage"],
                    status=item["status"],
                    total_attempts=item["total_attempts"],
                    unique_participants=item["unique_participants"],
                    passed_attempts=item["passed_attempts"],
                    pass_rate=item["pass_rate"],
                    average_score=item["average_score"],
                    highest_score=item["highest_score"],
                    lowest_score=item["lowest_score"],
                    average_time_spent_seconds=item["average_time_spent_seconds"],
                    score_distribution=InstructorScoreDistribution(**dist),
                )
            )

        return InstructorAssessmentsResponse(
            assessments=assessments,
            total=total,
            page=page,
            page_size=page_size,
        )

    # ========================================================================
    # Administrator Analytics
    # ========================================================================

    async def get_admin_overview(
        self,
        current_user: User,
        organization_id: uuid.UUID | None = None,
        days: int = 30,
    ) -> AdminOverviewResponse:
        """Returns organization-scoped administrative platform overview."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires ADMIN or SUPER_ADMIN role."
            )

        scoped_org_id = self._get_scoped_org_id(current_user, organization_id)
        stats = await self.analytics_repo.get_admin_overview_stats(
            organization_id=scoped_org_id, days=days
        )

        users_by_role = [RoleCountItem(**r) for r in stats["users_by_role"]]
        recent_activity = [
            AdminRecentActivityItem(**a) for a in stats["recent_activity"]
        ]
        trends = [AdminTrendItem(**t) for t in stats["trends"]]

        return AdminOverviewResponse(
            organization_id=stats["organization_id"],
            organization_name=stats["organization_name"],
            total_users=stats["total_users"],
            active_users=stats["active_users"],
            inactive_users=stats["inactive_users"],
            users_by_role=users_by_role,
            total_courses=stats["total_courses"],
            published_courses=stats["published_courses"],
            draft_courses=stats["draft_courses"],
            archived_courses=stats["archived_courses"],
            total_enrollments=stats["total_enrollments"],
            active_enrollments=stats["active_enrollments"],
            completed_enrollments=stats["completed_enrollments"],
            dropped_enrollments=stats["dropped_enrollments"],
            overall_completion_rate=stats["overall_completion_rate"],
            total_quiz_attempts=stats["total_quiz_attempts"],
            average_quiz_score=stats["average_quiz_score"],
            quiz_pass_rate=stats["quiz_pass_rate"],
            recent_activity=recent_activity,
            trends=trends,
        )

    async def get_admin_users(
        self,
        current_user: User,
        organization_id: uuid.UUID | None = None,
        role: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminUsersResponse:
        """Returns organization-scoped user demographics and activity statistics."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires ADMIN or SUPER_ADMIN role."
            )

        scoped_org_id = self._get_scoped_org_id(current_user, organization_id)
        summary, users_raw, total = await self.analytics_repo.get_admin_users_analytics(
            organization_id=scoped_org_id,
            role=role,
            search=search,
            page=page,
            page_size=page_size,
        )

        users = [AdminUserAnalyticsItem(**u) for u in users_raw]
        users_by_role = [RoleCountItem(**r) for r in summary["users_by_role"]]

        return AdminUsersResponse(
            total_users=summary["total_users"],
            active_users=summary["active_users"],
            inactive_users=summary["inactive_users"],
            users_by_role=users_by_role,
            users=users,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_admin_courses(
        self,
        current_user: User,
        organization_id: uuid.UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminCoursesResponse:
        """Returns organization-scoped course catalog metrics and completion statistics."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires ADMIN or SUPER_ADMIN role."
            )

        scoped_org_id = self._get_scoped_org_id(current_user, organization_id)
        summary, courses_raw, total = await self.analytics_repo.get_admin_courses_analytics(
            organization_id=scoped_org_id,
            status=status,
            search=search,
            page=page,
            page_size=page_size,
        )

        courses = [AdminCourseAnalyticsItem(**c) for c in courses_raw]

        return AdminCoursesResponse(
            total_courses=summary["total_courses"],
            published_courses=summary["published_courses"],
            draft_courses=summary["draft_courses"],
            archived_courses=summary["archived_courses"],
            courses=courses,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_admin_enrollments(
        self,
        current_user: User,
        organization_id: uuid.UUID | None = None,
        status: str | None = None,
        course_id: uuid.UUID | None = None,
        days: int = 30,
        page: int = 1,
        page_size: int = 20,
    ) -> AdminEnrollmentsResponse:
        """Returns organization-scoped enrollment distribution, trends, and student progress records."""
        user_roles = {r.upper() for r in current_user.role_names}
        if not user_roles.intersection({"ADMIN", "SUPER_ADMIN"}):
            raise AppExceptions.ForbiddenException(
                message="Access forbidden: Requires ADMIN or SUPER_ADMIN role."
            )

        scoped_org_id = self._get_scoped_org_id(current_user, organization_id)
        summary, items_raw, trends_raw, total = (
            await self.analytics_repo.get_admin_enrollments_analytics(
                organization_id=scoped_org_id,
                status=status,
                course_id=course_id,
                days=days,
                page=page,
                page_size=page_size,
            )
        )

        enrollments = [AdminEnrollmentItem(**i) for i in items_raw]
        trends = [AdminTrendItem(**t) for t in trends_raw]

        return AdminEnrollmentsResponse(
            total_enrollments=summary["total_enrollments"],
            active_enrollments=summary["active_enrollments"],
            completed_enrollments=summary["completed_enrollments"],
            dropped_enrollments=summary["dropped_enrollments"],
            completion_rate=summary["completion_rate"],
            enrollments=enrollments,
            trends=trends,
            total=total,
            page=page,
            page_size=page_size,
        )

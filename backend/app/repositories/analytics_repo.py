import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.audit import AuditLog
from backend.app.models.course import Course, CourseModule, CourseStatus, Lesson
from backend.app.models.enrollment import Enrollment, EnrollmentStatus, LessonProgress
from backend.app.models.organization import Organization
from backend.app.models.quiz import AttemptStatus, Quiz, QuizAttempt
from backend.app.models.role import Role, UserRole
from backend.app.models.user import User


class AnalyticsRepository:
    """Repository handling SQL aggregations and reporting queries for Analytics."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Student Analytics Queries
    # ========================================================================

    async def get_student_enrollments_summary(
        self, user_id: uuid.UUID
    ) -> dict[str, int]:
        """Calculates enrollment counts by status for a student."""
        stmt = (
            select(
                func.count(Enrollment.id).label("total"),
                func.count(
                    case((Enrollment.status == EnrollmentStatus.ACTIVE.value, 1))
                ).label("active"),
                func.count(
                    case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))
                ).label("completed"),
                func.count(
                    case((Enrollment.status == EnrollmentStatus.DROPPED.value, 1))
                ).label("dropped"),
            )
            .where(Enrollment.user_id == user_id)
        )
        res = await self.db.execute(stmt)
        row = res.one()
        return {
            "total": row.total or 0,
            "active": row.active or 0,
            "completed": row.completed or 0,
            "dropped": row.dropped or 0,
        }

    async def get_student_lessons_summary(
        self, user_id: uuid.UUID
    ) -> dict[str, int]:
        """Calculates total eligible lessons across active/completed enrolled courses and completed lessons."""
        # 1. Enrolled non-dropped course IDs
        enrolled_courses_subq = (
            select(Enrollment.course_id)
            .where(
                Enrollment.user_id == user_id,
                Enrollment.status != EnrollmentStatus.DROPPED.value,
            )
            .scalar_subquery()
        )

        # 2. Total lessons in these enrolled courses
        total_lessons_stmt = (
            select(func.count(Lesson.id))
            .join(CourseModule, Lesson.module_id == CourseModule.id)
            .where(CourseModule.course_id.in_(enrolled_courses_subq))
        )
        total_res = await self.db.execute(total_lessons_stmt)
        total_lessons = total_res.scalar_one() or 0

        # 3. Completed lessons for this user in these enrolled courses
        completed_lessons_stmt = (
            select(func.count(distinct(LessonProgress.lesson_id)))
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.is_completed.is_(True),
                LessonProgress.course_id.in_(enrolled_courses_subq),
            )
        )
        completed_res = await self.db.execute(completed_lessons_stmt)
        completed_lessons = completed_res.scalar_one() or 0

        return {
            "total_lessons": total_lessons,
            "completed_lessons": completed_lessons,
            "remaining_lessons": max(0, total_lessons - completed_lessons),
        }

    async def get_student_quizzes_summary(
        self, user_id: uuid.UUID
    ) -> dict[str, float | int]:
        """Calculates aggregate statistics for finalized quiz attempts."""
        stmt = (
            select(
                func.count(QuizAttempt.id).label("total_attempts"),
                func.count(
                    case((QuizAttempt.passed.is_(True), 1))
                ).label("passed_attempts"),
                func.avg(QuizAttempt.percentage_score).label("avg_score"),
                func.coalesce(func.sum(QuizAttempt.time_spent_seconds), 0).label("total_time_seconds"),
            )
            .where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
            )
        )
        res = await self.db.execute(stmt)
        row = res.one()

        total_attempts = row.total_attempts or 0
        passed_attempts = row.passed_attempts or 0
        avg_score = float(row.avg_score) if row.avg_score is not None else 0.0
        pass_rate = (passed_attempts / total_attempts * 100.0) if total_attempts > 0 else 0.0
        time_spent_minutes = int((row.total_time_seconds or 0) // 60)

        return {
            "total_attempts": total_attempts,
            "passed_attempts": passed_attempts,
            "average_score": round(avg_score, 2),
            "pass_rate": round(pass_rate, 2),
            "time_spent_minutes": time_spent_minutes,
        }

    async def get_student_resume_courses(
        self, user_id: uuid.UUID, limit: int = 4
    ) -> list[dict]:
        """Finds in-progress enrolled courses and identifies next incomplete lesson for quick resume."""
        # Find active enrollments ordered by enrolled_at / updated_at
        stmt = (
            select(Enrollment)
            .where(
                Enrollment.user_id == user_id,
                Enrollment.status == EnrollmentStatus.ACTIVE.value,
            )
            .options(
                selectinload(Enrollment.course).selectinload(Course.modules).selectinload(CourseModule.lessons),
            )
            .order_by(Enrollment.updated_at.desc())
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        enrollments = list(res.scalars().all())

        items = []
        for enr in enrollments:
            course = enr.course
            if not course:
                continue

            # Gather all lessons in order
            all_lessons = [
                les
                for mod in sorted(course.modules, key=lambda m: m.order_index)
                for les in sorted(mod.lessons, key=lambda l: l.order_index)
            ]

            total_count = len(all_lessons)
            if total_count == 0:
                continue

            # Fetch completed lesson IDs for this course
            prog_stmt = select(LessonProgress.lesson_id).where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course.id,
                LessonProgress.is_completed.is_(True),
            )
            prog_res = await self.db.execute(prog_stmt)
            completed_ids = set(prog_res.scalars().all())

            completed_count = len(completed_ids)
            progress_pct = (completed_count / total_count * 100.0) if total_count > 0 else 0.0

            # Find next incomplete lesson
            next_lesson = None
            for les in all_lessons:
                if les.id not in completed_ids:
                    next_lesson = les
                    break

            items.append({
                "course_id": course.id,
                "course_title": course.title,
                "thumbnail_url": course.thumbnail_url,
                "progress_percentage": round(progress_pct, 1),
                "completed_lessons": completed_count,
                "total_lessons": total_count,
                "next_lesson_id": next_lesson.id if next_lesson else None,
                "next_lesson_title": next_lesson.title if next_lesson else None,
            })

        return items

    async def get_student_recent_activities(
        self, user_id: uuid.UUID, limit: int = 15
    ) -> list[dict]:
        """Retrieves real stored learning events: lesson completions, quiz submissions, and enrollments."""
        events: list[dict] = []

        # 1. Lesson completions
        prog_stmt = (
            select(
                LessonProgress.id,
                LessonProgress.completed_at,
                Lesson.title.label("lesson_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .join(Lesson, LessonProgress.lesson_id == Lesson.id)
            .join(Course, LessonProgress.course_id == Course.id)
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.is_completed.is_(True),
                LessonProgress.completed_at.is_not(None),
            )
            .order_by(LessonProgress.completed_at.desc())
            .limit(limit)
        )
        prog_res = await self.db.execute(prog_stmt)
        for r in prog_res:
            events.append({
                "id": r.id,
                "activity_type": "lesson_completion",
                "title": f"Completed lesson: {r.lesson_title}",
                "subtitle": f"Course: {r.course_title}",
                "timestamp": r.completed_at,
                "status": "completed",
                "score": None,
                "course_id": r.course_id,
                "course_title": r.course_title,
            })

        # 2. Finalized quiz attempts
        quiz_stmt = (
            select(
                QuizAttempt.id,
                QuizAttempt.submitted_at,
                QuizAttempt.percentage_score,
                QuizAttempt.passed,
                Quiz.title.label("quiz_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .join(Course, Quiz.course_id == Course.id)
            .where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
                QuizAttempt.submitted_at.is_not(None),
            )
            .order_by(QuizAttempt.submitted_at.desc())
            .limit(limit)
        )
        quiz_res = await self.db.execute(quiz_stmt)
        for r in quiz_res:
            events.append({
                "id": r.id,
                "activity_type": "quiz_attempt",
                "title": f"Submitted quiz: {r.quiz_title}",
                "subtitle": f"Score: {r.percentage_score:.1f}% ({'Passed' if r.passed else 'Failed'})",
                "timestamp": r.submitted_at,
                "status": "passed" if r.passed else "failed",
                "score": r.percentage_score,
                "course_id": r.course_id,
                "course_title": r.course_title,
            })

        # 3. Course enrollments
        enr_stmt = (
            select(
                Enrollment.id,
                Enrollment.enrolled_at,
                Course.id.label("course_id"),
                Course.title.label("course_title"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(Enrollment.user_id == user_id)
            .order_by(Enrollment.enrolled_at.desc())
            .limit(limit)
        )
        enr_res = await self.db.execute(enr_stmt)
        for r in enr_res:
            events.append({
                "id": r.id,
                "activity_type": "course_enrollment",
                "title": f"Enrolled in course: {r.course_title}",
                "subtitle": "Course enrollment started",
                "timestamp": r.enrolled_at,
                "status": "enrolled",
                "score": None,
                "course_id": r.course_id,
                "course_title": r.course_title,
            })

        # Sort all combined events by timestamp desc and slice to limit
        events.sort(key=lambda x: x["timestamp"], reverse=True)
        return events[:limit]

    async def get_student_progress_trends(
        self, user_id: uuid.UUID, days: int = 30
    ) -> list[dict]:
        """Calculates daily lesson completions and quiz attempts over the specified time range."""
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        # 1. Lessons completed grouped by date
        lesson_stmt = (
            select(
                func.date(LessonProgress.completed_at).label("day"),
                func.count(LessonProgress.id).label("count"),
            )
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.is_completed.is_(True),
                LessonProgress.completed_at >= start_date,
            )
            .group_by(func.date(LessonProgress.completed_at))
        )
        lesson_res = await self.db.execute(lesson_stmt)
        lesson_map = {str(row.day): row.count for row in lesson_res if row.day}

        # 2. Quiz attempts completed grouped by date
        quiz_stmt = (
            select(
                func.date(QuizAttempt.submitted_at).label("day"),
                func.count(QuizAttempt.id).label("count"),
            )
            .where(
                QuizAttempt.user_id == user_id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
                QuizAttempt.submitted_at >= start_date,
            )
            .group_by(func.date(QuizAttempt.submitted_at))
        )
        quiz_res = await self.db.execute(quiz_stmt)
        quiz_map = {str(row.day): row.count for row in quiz_res if row.day}

        # Generate continuous date series
        trends = []
        for i in range(days):
            day_dt = (start_date + timedelta(days=i + 1)).date()
            day_str = str(day_dt)
            trends.append({
                "date": day_str,
                "lessons_completed": lesson_map.get(day_str, 0),
                "quizzes_completed": quiz_map.get(day_str, 0),
            })

        return trends

    async def get_student_assessments_list(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Returns paginated list of student finalized quiz attempts with details."""
        filters = [
            QuizAttempt.user_id == user_id,
            QuizAttempt.status == AttemptStatus.COMPLETED.value,
        ]
        if course_id:
            filters.append(Quiz.course_id == course_id)

        count_stmt = (
            select(func.count(QuizAttempt.id))
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(*filters)
        )
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(
                QuizAttempt.id.label("attempt_id"),
                QuizAttempt.quiz_id,
                Quiz.title.label("quiz_title"),
                Course.id.label("course_id"),
                Course.title.label("course_title"),
                QuizAttempt.attempt_number,
                QuizAttempt.score,
                QuizAttempt.max_score,
                QuizAttempt.percentage_score,
                QuizAttempt.passed,
                QuizAttempt.time_spent_seconds,
                QuizAttempt.submitted_at,
            )
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .join(Course, Quiz.course_id == Course.id)
            .where(*filters)
            .order_by(QuizAttempt.submitted_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        res = await self.db.execute(stmt)
        results = [dict(r._mapping) for r in res]
        return results, total

    # ========================================================================
    # Instructor Analytics Queries
    # ========================================================================

    async def get_instructor_overview_stats(
        self,
        instructor_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        organization_id: uuid.UUID | None = None,
        days: int = 30,
    ) -> dict:
        """Calculates comprehensive instructor overview metrics strictly isolated to their own courses,
        with optional course_id and organization_id filtering."""
        c_filters = [Course.instructor_id == instructor_id]
        if course_id:
            c_filters.append(Course.id == course_id)
        if organization_id:
            c_filters.append(Course.organization_id == organization_id)

        # 1. Course counts
        courses_stmt = (
            select(
                func.count(Course.id).label("total"),
                func.count(case((Course.status == CourseStatus.PUBLISHED.value, 1))).label("published"),
                func.count(case((Course.status == CourseStatus.DRAFT.value, 1))).label("draft"),
                func.count(case((Course.status == CourseStatus.ARCHIVED.value, 1))).label("archived"),
            )
            .where(*c_filters)
        )
        courses_res = await self.db.execute(courses_stmt)
        c_row = courses_res.one()

        # Scoped subquery for courses
        instructor_course_subq = (
            select(Course.id).where(*c_filters).scalar_subquery()
        )

        # 2. Enrollments across instructor's courses
        enr_stmt = (
            select(
                func.count(Enrollment.id).label("total_enrollments"),
                func.count(case((Enrollment.status == EnrollmentStatus.ACTIVE.value, 1))).label("active"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((Enrollment.status == EnrollmentStatus.DROPPED.value, 1))).label("dropped"),
                func.count(distinct(Enrollment.user_id)).label("unique_students"),
            )
            .where(Enrollment.course_id.in_(instructor_course_subq))
        )
        enr_res = await self.db.execute(enr_stmt)
        e_row = enr_res.one()

        total_enr = e_row.total_enrollments or 0
        completed_enr = e_row.completed or 0
        completion_rate = (completed_enr / total_enr * 100.0) if total_enr > 0 else 0.0

        # 3. Lessons and lesson completions (distinct progress IDs prevents duplicates)
        total_lessons_stmt = (
            select(func.count(Lesson.id))
            .join(CourseModule, Lesson.module_id == CourseModule.id)
            .where(CourseModule.course_id.in_(instructor_course_subq))
        )
        total_lessons = (await self.db.execute(total_lessons_stmt)).scalar_one() or 0

        total_completions_stmt = (
            select(func.count(distinct(LessonProgress.id)))
            .where(
                LessonProgress.course_id.in_(instructor_course_subq),
                LessonProgress.is_completed.is_(True),
            )
        )
        total_completions = (await self.db.execute(total_completions_stmt)).scalar_one() or 0

        # Progress rate = completions / (total_lessons * total_enr) if > 0
        possible_completions = total_lessons * total_enr
        progress_rate = (
            (total_completions / possible_completions * 100.0)
            if possible_completions > 0
            else 0.0
        )

        # 4. Quizzes and Attempts
        quizzes_stmt = (
            select(func.count(Quiz.id))
            .where(Quiz.course_id.in_(instructor_course_subq))
        )
        total_quizzes = (await self.db.execute(quizzes_stmt)).scalar_one() or 0

        attempts_stmt = (
            select(
                func.count(QuizAttempt.id).label("total_attempts"),
                func.count(case((QuizAttempt.passed.is_(True), 1))).label("passed_attempts"),
                func.avg(QuizAttempt.percentage_score).label("avg_score"),
            )
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(
                Quiz.course_id.in_(instructor_course_subq),
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
            )
        )
        att_res = await self.db.execute(attempts_stmt)
        a_row = att_res.one()

        total_attempts = a_row.total_attempts or 0
        passed_attempts = a_row.passed_attempts or 0
        avg_score = float(a_row.avg_score) if a_row.avg_score is not None else 0.0
        pass_rate = (passed_attempts / total_attempts * 100.0) if total_attempts > 0 else 0.0

        # 5. Trends over time
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        enr_trend_stmt = (
            select(
                func.date(Enrollment.enrolled_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .where(
                Enrollment.course_id.in_(instructor_course_subq),
                Enrollment.enrolled_at >= start_date,
            )
            .group_by(func.date(Enrollment.enrolled_at))
        )
        enr_trend_res = await self.db.execute(enr_trend_stmt)
        enr_map = {str(r.day): r.count for r in enr_trend_res if r.day}

        comp_trend_stmt = (
            select(
                func.date(Enrollment.completed_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .where(
                Enrollment.course_id.in_(instructor_course_subq),
                Enrollment.status == EnrollmentStatus.COMPLETED.value,
                Enrollment.completed_at.is_not(None),
                Enrollment.completed_at >= start_date,
            )
            .group_by(func.date(Enrollment.completed_at))
        )
        comp_trend_res = await self.db.execute(comp_trend_stmt)
        comp_map = {str(r.day): r.count for r in comp_trend_res if r.day}

        att_trend_stmt = (
            select(
                func.date(QuizAttempt.submitted_at).label("day"),
                func.count(QuizAttempt.id).label("count"),
            )
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(
                Quiz.course_id.in_(instructor_course_subq),
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
                QuizAttempt.submitted_at >= start_date,
            )
            .group_by(func.date(QuizAttempt.submitted_at))
        )
        att_trend_res = await self.db.execute(att_trend_stmt)
        att_map = {str(r.day): r.count for r in att_trend_res if r.day}

        trends = []
        for i in range(days):
            day_dt = (start_date + timedelta(days=i + 1)).date()
            day_str = str(day_dt)
            trends.append({
                "date": day_str,
                "enrollments": enr_map.get(day_str, 0),
                "completions": comp_map.get(day_str, 0),
                "quiz_attempts": att_map.get(day_str, 0),
            })

        return {
            "total_courses": c_row.total or 0,
            "published_courses": c_row.published or 0,
            "draft_courses": c_row.draft or 0,
            "archived_courses": c_row.archived or 0,
            "total_enrollments": total_enr,
            "active_enrollments": e_row.active or 0,
            "completed_enrollments": completed_enr,
            "dropped_enrollments": e_row.dropped or 0,
            "unique_students": e_row.unique_students or 0,
            "course_completion_rate": round(completion_rate, 2),
            "total_lessons": total_lessons,
            "total_lesson_completions": total_completions,
            "student_lesson_progress_rate": round(progress_rate, 2),
            "total_quizzes": total_quizzes,
            "total_quiz_attempts": total_attempts,
            "average_quiz_score": round(avg_score, 2),
            "quiz_pass_rate": round(pass_rate, 2),
            "trends": trends,
            "course_id": course_id,
            "organization_id": organization_id,
        }

    async def get_instructor_course_comparisons(
        self,
        instructor_id: uuid.UUID,
        organization_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
    ) -> tuple[list[dict], int]:
        """Provides per-course analytics comparison for courses owned by the instructor."""
        filters = [Course.instructor_id == instructor_id]
        if organization_id:
            filters.append(Course.organization_id == organization_id)
        if search:
            filters.append(Course.title.ilike(f"%{search.strip()}%"))

        count_stmt = select(func.count(Course.id)).where(*filters)
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        courses_stmt = (
            select(Course)
            .where(*filters)
            .options(
                selectinload(Course.modules).selectinload(CourseModule.lessons),
            )
            .order_by(Course.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        courses_res = await self.db.execute(courses_stmt)
        courses = list(courses_res.scalars().all())

        items = []
        for course in courses:
            total_lessons = sum(len(m.lessons) for m in course.modules)

            # Enrollments for this course
            enr_stmt = select(
                func.count(Enrollment.id).label("total"),
                func.count(case((Enrollment.status == EnrollmentStatus.ACTIVE.value, 1))).label("active"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((Enrollment.status == EnrollmentStatus.DROPPED.value, 1))).label("dropped"),
            ).where(Enrollment.course_id == course.id)
            enr_row = (await self.db.execute(enr_stmt)).one()

            total_enr = enr_row.total or 0
            completed_enr = enr_row.completed or 0
            comp_rate = (completed_enr / total_enr * 100.0) if total_enr > 0 else 0.0

            # Quiz stats for this course
            q_stmt = (
                select(
                    func.count(QuizAttempt.id).label("attempts"),
                    func.count(case((QuizAttempt.passed.is_(True), 1))).label("passed"),
                    func.avg(QuizAttempt.percentage_score).label("avg_score"),
                )
                .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
                .where(
                    Quiz.course_id == course.id,
                    QuizAttempt.status == AttemptStatus.COMPLETED.value,
                )
            )
            q_row = (await self.db.execute(q_stmt)).one()
            attempts = q_row.attempts or 0
            passed = q_row.passed or 0
            avg_score = float(q_row.avg_score) if q_row.avg_score is not None else 0.0
            pass_rate = (passed / attempts * 100.0) if attempts > 0 else 0.0

            items.append({
                "course_id": course.id,
                "title": course.title,
                "status": course.status,
                "difficulty": course.difficulty,
                "total_lessons": total_lessons,
                "total_enrollments": total_enr,
                "active_enrollments": enr_row.active or 0,
                "completed_enrollments": completed_enr,
                "dropped_enrollments": enr_row.dropped or 0,
                "completion_rate": round(comp_rate, 2),
                "total_quiz_attempts": attempts,
                "average_quiz_score": round(avg_score, 2),
                "quiz_pass_rate": round(pass_rate, 2),
                "created_at": course.created_at,
                "published_at": course.published_at,
            })

        return items, total

    async def get_instructor_assessments_detail(
        self,
        instructor_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict], int]:
        """Calculates granular quiz performance metrics, pass rates, and score distributions."""
        filters = [Quiz.instructor_id == instructor_id]
        if course_id:
            filters.append(Quiz.course_id == course_id)

        count_stmt = select(func.count(Quiz.id)).where(*filters)
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        quizzes_stmt = (
            select(Quiz)
            .where(*filters)
            .options(selectinload(Quiz.course))
            .order_by(Quiz.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        quizzes = list((await self.db.execute(quizzes_stmt)).scalars().all())

        items = []
        for q in quizzes:
            # Finalized attempt stats
            att_stmt = select(
                func.count(QuizAttempt.id).label("total_attempts"),
                func.count(distinct(QuizAttempt.user_id)).label("unique_participants"),
                func.count(case((QuizAttempt.passed.is_(True), 1))).label("passed"),
                func.avg(QuizAttempt.percentage_score).label("avg_score"),
                func.max(QuizAttempt.percentage_score).label("highest_score"),
                func.min(QuizAttempt.percentage_score).label("lowest_score"),
                func.avg(QuizAttempt.time_spent_seconds).label("avg_time"),
                func.count(case((QuizAttempt.percentage_score <= 50.0, 1))).label("r_0_50"),
                func.count(
                    case((QuizAttempt.percentage_score > 50.0, 1))
                    & case((QuizAttempt.percentage_score <= 70.0, 1))
                ).label("r_51_70"),
                func.count(
                    case((QuizAttempt.percentage_score > 70.0, 1))
                    & case((QuizAttempt.percentage_score <= 85.0, 1))
                ).label("r_71_85"),
                func.count(case((QuizAttempt.percentage_score > 85.0, 1))).label("r_86_100"),
            ).where(
                QuizAttempt.quiz_id == q.id,
                QuizAttempt.status == AttemptStatus.COMPLETED.value,
            )
            att_row = (await self.db.execute(att_stmt)).one()

            total_att = att_row.total_attempts or 0
            passed = att_row.passed or 0
            pass_rate = (passed / total_att * 100.0) if total_att > 0 else 0.0

            items.append({
                "quiz_id": q.id,
                "title": q.title,
                "course_id": q.course_id,
                "course_title": q.course.title if q.course else "Unknown",
                "passing_score_percentage": q.passing_score_percentage,
                "status": q.status,
                "total_attempts": total_att,
                "unique_participants": att_row.unique_participants or 0,
                "passed_attempts": passed,
                "pass_rate": round(pass_rate, 2),
                "average_score": round(float(att_row.avg_score or 0.0), 2),
                "highest_score": round(float(att_row.highest_score or 0.0), 2),
                "lowest_score": round(float(att_row.lowest_score or 0.0), 2),
                "average_time_spent_seconds": round(float(att_row.avg_time or 0.0), 1) if att_row.avg_time else None,
                "score_distribution": {
                    "range_0_50": att_row.r_0_50 or 0,
                    "range_51_70": att_row.r_51_70 or 0,
                    "range_71_85": att_row.r_71_85 or 0,
                    "range_86_100": att_row.r_86_100 or 0,
                },
            })

        return items, total

    # ========================================================================
    # Administrator Analytics Queries (Organization Scoped)
    # ========================================================================

    async def get_admin_overview_stats(
        self, organization_id: uuid.UUID | None = None, days: int = 30
    ) -> dict:
        """Calculates aggregate system statistics scoped to organization (or platform-wide for Super Admin)."""
        # 1. Organization info
        org_name = None
        if organization_id:
            org_stmt = select(Organization.name).where(Organization.id == organization_id)
            org_name = (await self.db.execute(org_stmt)).scalar_one_or_none()

        # 2. Users count
        u_filters = []
        if organization_id:
            u_filters.append(User.organization_id == organization_id)

        user_stmt = select(
            func.count(User.id).label("total"),
            func.count(case((User.is_active.is_(True), 1))).label("active"),
            func.count(case((User.is_active.is_(False), 1))).label("inactive"),
        ).where(*u_filters)
        u_row = (await self.db.execute(user_stmt)).one()

        # Users by role
        role_stmt = (
            select(Role.name, func.count(User.id))
            .join(UserRole, Role.id == UserRole.role_id)
            .join(User, UserRole.user_id == User.id)
            .where(*u_filters)
            .group_by(Role.name)
        )
        role_res = await self.db.execute(role_stmt)
        users_by_role = [{"role": r[0], "count": r[1]} for r in role_res]

        # 3. Courses count
        c_filters = []
        if organization_id:
            c_filters.append(Course.organization_id == organization_id)

        course_stmt = select(
            func.count(Course.id).label("total"),
            func.count(case((Course.status == CourseStatus.PUBLISHED.value, 1))).label("published"),
            func.count(case((Course.status == CourseStatus.DRAFT.value, 1))).label("draft"),
            func.count(case((Course.status == CourseStatus.ARCHIVED.value, 1))).label("archived"),
        ).where(*c_filters)
        c_row = (await self.db.execute(course_stmt)).one()

        # 4. Enrollments count
        e_filters = []
        if organization_id:
            e_filters.append(Course.organization_id == organization_id)

        enr_stmt = (
            select(
                func.count(Enrollment.id).label("total"),
                func.count(case((Enrollment.status == EnrollmentStatus.ACTIVE.value, 1))).label("active"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((Enrollment.status == EnrollmentStatus.DROPPED.value, 1))).label("dropped"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(*e_filters)
        )
        e_row = (await self.db.execute(enr_stmt)).one()

        total_enr = e_row.total or 0
        completed_enr = e_row.completed or 0
        comp_rate = (completed_enr / total_enr * 100.0) if total_enr > 0 else 0.0

        # 5. Quiz performance
        q_filters = [QuizAttempt.status == AttemptStatus.COMPLETED.value]
        if organization_id:
            q_filters.append(Quiz.organization_id == organization_id)

        att_stmt = (
            select(
                func.count(QuizAttempt.id).label("total_attempts"),
                func.count(case((QuizAttempt.passed.is_(True), 1))).label("passed"),
                func.avg(QuizAttempt.percentage_score).label("avg_score"),
            )
            .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
            .where(*q_filters)
        )
        att_row = (await self.db.execute(att_stmt)).one()

        total_attempts = att_row.total_attempts or 0
        passed_attempts = att_row.passed or 0
        pass_rate = (passed_attempts / total_attempts * 100.0) if total_attempts > 0 else 0.0

        # 6. Recent Platform Audit Activity
        audit_filters = []
        if organization_id:
            audit_filters.append(User.organization_id == organization_id)

        audit_stmt = (
            select(
                AuditLog.id,
                AuditLog.event_type,
                AuditLog.user_id,
                AuditLog.created_at,
                AuditLog.metadata_json,
                User.email.label("user_email"),
            )
            .outerjoin(User, AuditLog.user_id == User.id)
            .where(*audit_filters)
            .order_by(AuditLog.created_at.desc())
            .limit(10)
        )
        audit_res = await self.db.execute(audit_stmt)
        recent_activity = [
            {
                "id": r.id,
                "event_type": r.event_type,
                "description": f"Audit event: {r.event_type}",
                "user_id": r.user_id,
                "user_email": r.user_email,
                "timestamp": r.created_at,
                "metadata_json": r.metadata_json or {},
            }
            for r in audit_res
        ]

        # 7. Trends
        start_date = datetime.now(timezone.utc) - timedelta(days=days)

        u_trend_stmt = (
            select(
                func.date(User.created_at).label("day"),
                func.count(User.id).label("count"),
            )
            .where(
                *u_filters,
                User.created_at >= start_date,
            )
            .group_by(func.date(User.created_at))
        )
        u_trend_res = await self.db.execute(u_trend_stmt)
        u_map = {str(r.day): r.count for r in u_trend_res if r.day}

        e_trend_stmt = (
            select(
                func.date(Enrollment.enrolled_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(
                *e_filters,
                Enrollment.enrolled_at >= start_date,
            )
            .group_by(func.date(Enrollment.enrolled_at))
        )
        e_trend_res = await self.db.execute(e_trend_stmt)
        e_map = {str(r.day): r.count for r in e_trend_res if r.day}

        c_trend_stmt = (
            select(
                func.date(Enrollment.completed_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(
                *e_filters,
                Enrollment.status == EnrollmentStatus.COMPLETED.value,
                Enrollment.completed_at.is_not(None),
                Enrollment.completed_at >= start_date,
            )
            .group_by(func.date(Enrollment.completed_at))
        )
        c_trend_res = await self.db.execute(c_trend_stmt)
        c_map = {str(r.day): r.count for r in c_trend_res if r.day}

        trends = []
        for i in range(days):
            day_dt = (start_date + timedelta(days=i + 1)).date()
            day_str = str(day_dt)
            trends.append({
                "date": day_str,
                "new_users": u_map.get(day_str, 0),
                "new_enrollments": e_map.get(day_str, 0),
                "completions": c_map.get(day_str, 0),
            })

        return {
            "organization_id": organization_id,
            "organization_name": org_name,
            "total_users": u_row.total or 0,
            "active_users": u_row.active or 0,
            "inactive_users": u_row.inactive or 0,
            "users_by_role": users_by_role,
            "total_courses": c_row.total or 0,
            "published_courses": c_row.published or 0,
            "draft_courses": c_row.draft or 0,
            "archived_courses": c_row.archived or 0,
            "total_enrollments": total_enr,
            "active_enrollments": e_row.active or 0,
            "completed_enrollments": completed_enr,
            "dropped_enrollments": e_row.dropped or 0,
            "overall_completion_rate": round(comp_rate, 2),
            "total_quiz_attempts": total_attempts,
            "average_quiz_score": round(float(att_row.avg_score or 0.0), 2),
            "quiz_pass_rate": round(pass_rate, 2),
            "recent_activity": recent_activity,
            "trends": trends,
        }

    async def get_admin_users_analytics(
        self,
        organization_id: uuid.UUID | None = None,
        role: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[dict, list[dict], int]:
        """Returns role breakdown and paginated list of users with enrollment counts."""
        filters = []
        if organization_id:
            filters.append(User.organization_id == organization_id)
        if search:
            filters.append(
                or_(
                    User.email.ilike(f"%{search.strip()}%"),
                    User.first_name.ilike(f"%{search.strip()}%"),
                    User.last_name.ilike(f"%{search.strip()}%"),
                )
            )
        if role:
            filters.append(Role.name.ilike(role.strip()))

        # Base user count & breakdown
        u_filters = [User.organization_id == organization_id] if organization_id else []
        summary_stmt = select(
            func.count(User.id).label("total"),
            func.count(case((User.is_active.is_(True), 1))).label("active"),
            func.count(case((User.is_active.is_(False), 1))).label("inactive"),
        ).where(*u_filters)
        s_row = (await self.db.execute(summary_stmt)).one()

        role_stmt = (
            select(Role.name, func.count(User.id))
            .join(UserRole, Role.id == UserRole.role_id)
            .join(User, UserRole.user_id == User.id)
            .where(*u_filters)
            .group_by(Role.name)
        )
        role_res = await self.db.execute(role_stmt)
        users_by_role = [{"role": r[0], "count": r[1]} for r in role_res]

        # Paginated users
        count_stmt = select(func.count(distinct(User.id))).join(User.roles).where(*filters)
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(User)
            .join(User.roles)
            .where(*filters)
            .options(selectinload(User.roles))
            .distinct()
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        users = list((await self.db.execute(stmt)).scalars().all())

        user_items = []
        for u in users:
            # Count enrolled and completed courses
            enr_stmt = select(
                func.count(Enrollment.id).label("total"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
            ).where(Enrollment.user_id == u.id)
            enr_row = (await self.db.execute(enr_stmt)).one()

            user_items.append({
                "user_id": u.id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "roles": [r.name for r in u.roles],
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "enrolled_courses_count": enr_row.total or 0,
                "completed_courses_count": enr_row.completed or 0,
                "created_at": u.created_at,
                "last_login_at": u.last_login_at,
            })

        summary = {
            "total_users": s_row.total or 0,
            "active_users": s_row.active or 0,
            "inactive_users": s_row.inactive or 0,
            "users_by_role": users_by_role,
        }
        return summary, user_items, total

    async def get_admin_courses_analytics(
        self,
        organization_id: uuid.UUID | None = None,
        status: str | None = None,
        search: str | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[dict, list[dict], int]:
        """Returns course summary breakdown and paginated courses list with stats."""
        filters = []
        if organization_id:
            filters.append(Course.organization_id == organization_id)
        if status:
            filters.append(Course.status == status)
        if search:
            filters.append(Course.title.ilike(f"%{search.strip()}%"))

        # Summary counts
        c_filters = [Course.organization_id == organization_id] if organization_id else []
        summary_stmt = select(
            func.count(Course.id).label("total"),
            func.count(case((Course.status == CourseStatus.PUBLISHED.value, 1))).label("published"),
            func.count(case((Course.status == CourseStatus.DRAFT.value, 1))).label("draft"),
            func.count(case((Course.status == CourseStatus.ARCHIVED.value, 1))).label("archived"),
        ).where(*c_filters)
        s_row = (await self.db.execute(summary_stmt)).one()

        # Paginated courses
        count_stmt = select(func.count(Course.id)).where(*filters)
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        courses_stmt = (
            select(Course)
            .where(*filters)
            .options(
                selectinload(Course.instructor),
                selectinload(Course.category),
                selectinload(Course.modules).selectinload(CourseModule.lessons),
            )
            .order_by(Course.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        courses = list((await self.db.execute(courses_stmt)).scalars().all())

        items = []
        for c in courses:
            total_lessons = sum(len(m.lessons) for m in c.modules)

            enr_stmt = select(
                func.count(Enrollment.id).label("total"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
            ).where(Enrollment.course_id == c.id)
            enr_row = (await self.db.execute(enr_stmt)).one()

            total_enr = enr_row.total or 0
            completed_enr = enr_row.completed or 0
            comp_rate = (completed_enr / total_enr * 100.0) if total_enr > 0 else 0.0

            q_stmt = (
                select(func.avg(QuizAttempt.percentage_score))
                .join(Quiz, QuizAttempt.quiz_id == Quiz.id)
                .where(
                    Quiz.course_id == c.id,
                    QuizAttempt.status == AttemptStatus.COMPLETED.value,
                )
            )
            avg_score = (await self.db.execute(q_stmt)).scalar_one() or 0.0

            items.append({
                "course_id": c.id,
                "title": c.title,
                "instructor_name": f"{c.instructor.first_name} {c.instructor.last_name}" if c.instructor else "Unknown",
                "instructor_email": c.instructor.email if c.instructor else "Unknown",
                "category_name": c.category.name if c.category else None,
                "status": c.status,
                "difficulty": c.difficulty,
                "total_enrollments": total_enr,
                "completed_enrollments": completed_enr,
                "completion_rate": round(comp_rate, 2),
                "total_lessons": total_lessons,
                "average_quiz_score": round(float(avg_score), 2),
                "created_at": c.created_at,
            })

        summary = {
            "total_courses": s_row.total or 0,
            "published_courses": s_row.published or 0,
            "draft_courses": s_row.draft or 0,
            "archived_courses": s_row.archived or 0,
        }
        return summary, items, total

    async def get_admin_enrollments_analytics(
        self,
        organization_id: uuid.UUID | None = None,
        status: str | None = None,
        course_id: uuid.UUID | None = None,
        days: int = 30,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[dict, list[dict], list[dict], int]:
        """Returns enrollment breakdown stats, trend series, and paginated enrollment items."""
        filters = []
        if organization_id:
            filters.append(Course.organization_id == organization_id)
        if status:
            filters.append(Enrollment.status == status)
        if course_id:
            filters.append(Enrollment.course_id == course_id)

        # 1. Summary stats
        base_filters = [Course.organization_id == organization_id] if organization_id else []
        sum_stmt = (
            select(
                func.count(Enrollment.id).label("total"),
                func.count(case((Enrollment.status == EnrollmentStatus.ACTIVE.value, 1))).label("active"),
                func.count(case((Enrollment.status == EnrollmentStatus.COMPLETED.value, 1))).label("completed"),
                func.count(case((Enrollment.status == EnrollmentStatus.DROPPED.value, 1))).label("dropped"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(*base_filters)
        )
        s_row = (await self.db.execute(sum_stmt)).one()

        total_enr = s_row.total or 0
        comp_enr = s_row.completed or 0
        comp_rate = (comp_enr / total_enr * 100.0) if total_enr > 0 else 0.0

        # 2. Trends
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        e_trend_stmt = (
            select(
                func.date(Enrollment.enrolled_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(
                *base_filters,
                Enrollment.enrolled_at >= start_date,
            )
            .group_by(func.date(Enrollment.enrolled_at))
        )
        e_trend_res = await self.db.execute(e_trend_stmt)
        e_map = {str(r.day): r.count for r in e_trend_res if r.day}

        c_trend_stmt = (
            select(
                func.date(Enrollment.completed_at).label("day"),
                func.count(Enrollment.id).label("count"),
            )
            .join(Course, Enrollment.course_id == Course.id)
            .where(
                *base_filters,
                Enrollment.status == EnrollmentStatus.COMPLETED.value,
                Enrollment.completed_at.is_not(None),
                Enrollment.completed_at >= start_date,
            )
            .group_by(func.date(Enrollment.completed_at))
        )
        c_trend_res = await self.db.execute(c_trend_stmt)
        c_map = {str(r.day): r.count for r in c_trend_res if r.day}

        trends = []
        for i in range(days):
            day_dt = (start_date + timedelta(days=i + 1)).date()
            day_str = str(day_dt)
            trends.append({
                "date": day_str,
                "new_users": 0,
                "new_enrollments": e_map.get(day_str, 0),
                "completions": c_map.get(day_str, 0),
            })

        # 3. Paginated list
        count_stmt = (
            select(func.count(Enrollment.id))
            .join(Course, Enrollment.course_id == Course.id)
            .where(*filters)
        )
        total = (await self.db.execute(count_stmt)).scalar_one() or 0

        offset = (page - 1) * page_size
        stmt = (
            select(Enrollment)
            .join(Course, Enrollment.course_id == Course.id)
            .where(*filters)
            .options(
                selectinload(Enrollment.user),
                selectinload(Enrollment.course).selectinload(Course.modules).selectinload(CourseModule.lessons),
            )
            .order_by(Enrollment.enrolled_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        enrollments = list((await self.db.execute(stmt)).scalars().all())

        items = []
        for enr in enrollments:
            total_lessons = (
                sum(len(m.lessons) for m in enr.course.modules) if enr.course else 0
            )

            # Count completed lessons for this enrollment
            prog_stmt = select(func.count(LessonProgress.id)).where(
                LessonProgress.user_id == enr.user_id,
                LessonProgress.course_id == enr.course_id,
                LessonProgress.is_completed.is_(True),
            )
            completed_lessons = (await self.db.execute(prog_stmt)).scalar_one() or 0
            progress_pct = (
                (completed_lessons / total_lessons * 100.0) if total_lessons > 0 else 0.0
            )

            items.append({
                "enrollment_id": enr.id,
                "user_id": enr.user_id,
                "user_name": f"{enr.user.first_name} {enr.user.last_name}" if enr.user else "Unknown",
                "user_email": enr.user.email if enr.user else "Unknown",
                "course_id": enr.course_id,
                "course_title": enr.course.title if enr.course else "Unknown",
                "status": enr.status,
                "progress_percentage": round(progress_pct, 1),
                "enrolled_at": enr.enrolled_at,
                "completed_at": enr.completed_at,
            })

        summary = {
            "total_enrollments": total_enr,
            "active_enrollments": s_row.active or 0,
            "completed_enrollments": comp_enr,
            "dropped_enrollments": s_row.dropped or 0,
            "completion_rate": round(comp_rate, 2),
        }
        return summary, items, trends, total

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.errors import (
    ConflictError,
    ForbiddenError,
    ResourceNotFoundError,
    ValidationException,
)
from backend.app.core.rbac import SystemRole
from backend.app.models.course import Course, CourseStatus
from backend.app.models.enrollment import Enrollment, EnrollmentStatus
from backend.app.models.user import User
from backend.app.repositories.course_repo import CourseRepository
from backend.app.repositories.enrollment_repo import EnrollmentRepository
from backend.app.repositories.progress_repo import ProgressRepository
from backend.app.repositories.user_repo import UserRepository
from backend.app.schemas.course import CourseResponse
from backend.app.schemas.enrollment import (
    EnrollmentListResponse,
    EnrollmentResponse,
)
from backend.app.schemas.learning import (
    BatchProgressSyncResponse,
    CourseProgressResponse,
    LearningCourseResponse,
    LearningLessonResponse,
    LearningModuleResponse,
    LessonProgressBatchItem,
    LessonProgressResponse,
    ResumeLearningResponse,
)


def to_course_response(course: Course) -> CourseResponse:
    """Helper to convert Course model to CourseResponse schema."""
    modules_count = (
        len(course.modules)
        if "modules" in course.__dict__ and course.modules
        else 0
    )
    lessons_count = 0
    if "modules" in course.__dict__ and course.modules:
        for m in course.modules:
            if "lessons" in m.__dict__ and m.lessons:
                lessons_count += len(m.lessons)

    return CourseResponse(
        id=course.id,
        organization_id=course.organization_id,
        instructor_id=course.instructor_id,
        instructor=course.instructor if "instructor" in course.__dict__ else None,
        category_id=course.category_id,
        category=course.category if "category" in course.__dict__ else None,
        title=course.title,
        slug=course.slug,
        short_description=course.short_description,
        description=course.description,
        thumbnail_url=course.thumbnail_url,
        difficulty=course.difficulty,
        duration_minutes=course.duration_minutes,
        learning_objectives=course.learning_objectives,
        prerequisites=course.prerequisites,
        status=course.status,
        language=course.language,
        published_at=course.published_at,
        created_at=course.created_at,
        updated_at=course.updated_at,
        modules_count=modules_count,
        lessons_count=lessons_count,
    )


class LearningService:
    """Core domain service for student enrollment, course navigation, and progress tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.enrollment_repo = EnrollmentRepository(db)
        self.progress_repo = ProgressRepository(db)
        self.course_repo = CourseRepository(db)
        self.user_repo = UserRepository(db)

    def _is_admin(self, user: User) -> bool:
        roles = {r.upper() for r in user.role_names}
        return SystemRole.SUPER_ADMIN.value in roles or SystemRole.ADMIN.value in roles

    # -----------------------------------------------------------------------
    # Enrollment Lifecycle
    # -----------------------------------------------------------------------

    async def enroll_student(
        self, current_user: User, course_id: uuid.UUID
    ) -> EnrollmentResponse:
        """Enroll the authenticated student in a published course."""
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise ResourceNotFoundError(message="Course not found.")

        # 1. Publication status validation (only published courses allow enrollment)
        if course.status == CourseStatus.DRAFT.value:
            raise ValidationException(
                message="Cannot enroll in an unpublished course."
            )
        if course.status == CourseStatus.ARCHIVED.value:
            raise ValidationException(
                message="Cannot enroll in an archived course."
            )
        if course.status != CourseStatus.PUBLISHED.value:
            raise ValidationException(
                message="Course is not open for enrollment."
            )

        # 2. Organization tenant boundary check
        if course.organization_id is not None:
            user_roles = {r.upper() for r in current_user.role_names}
            if "SUPER_ADMIN" not in user_roles and current_user.organization_id != course.organization_id:
                raise ForbiddenError(
                    message="Course is not accessible within your organization."
                )

        # 3. Duplicate enrollment prevention
        existing = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )
        if existing:
            if existing.status in (
                EnrollmentStatus.ACTIVE.value,
                EnrollmentStatus.COMPLETED.value,
            ):
                raise ConflictError(
                    message="User is already enrolled in this course."
                )
            if existing.status == EnrollmentStatus.DROPPED.value:
                # Reactivate previously dropped enrollment
                existing.status = EnrollmentStatus.ACTIVE.value
                existing.enrolled_at = datetime.now(timezone.utc)
                existing.completed_at = None
                await self.enrollment_repo.update(existing)
                await self.db.commit()
                enrollment = existing
        else:
            enrollment = Enrollment(
                user_id=current_user.id,
                course_id=course_id,
                status=EnrollmentStatus.ACTIVE.value,
            )
            await self.enrollment_repo.create(enrollment)
            await self.db.commit()

        # Re-fetch with loaded relations
        loaded = await self.enrollment_repo.get_by_id(enrollment.id)
        if not loaded:
            raise ResourceNotFoundError(message="Enrollment could not be loaded.")

        progress = await self.get_course_progress(current_user, course_id)
        resume = await self.resume_course(current_user, course_id)

        return EnrollmentResponse(
            id=loaded.id,
            user_id=loaded.user_id,
            course_id=loaded.course_id,
            status=loaded.status,
            enrolled_at=loaded.enrolled_at,
            completed_at=loaded.completed_at,
            created_at=loaded.created_at,
            updated_at=loaded.updated_at,
            course=to_course_response(loaded.course) if loaded.course else None,
            progress_percentage=progress.progress_percentage,
            completed_lessons_count=progress.completed_lessons,
            total_lessons_count=progress.total_lessons,
            next_lesson_id=resume.next_lesson_id,
        )

    async def list_my_enrollments(
        self, current_user: User
    ) -> EnrollmentListResponse:
        """List all courses the authenticated student is currently enrolled in."""
        enrollments = await self.enrollment_repo.list_by_user(current_user.id)
        items: list[EnrollmentResponse] = []

        for enrollment in enrollments:
            # Exclude dropped enrollments from active my-learning view
            if enrollment.status == EnrollmentStatus.DROPPED.value:
                continue

            progress = await self.get_course_progress(
                current_user, enrollment.course_id
            )
            resume = await self.resume_course(current_user, enrollment.course_id)

            items.append(
                EnrollmentResponse(
                    id=enrollment.id,
                    user_id=enrollment.user_id,
                    course_id=enrollment.course_id,
                    status=enrollment.status,
                    enrolled_at=enrollment.enrolled_at,
                    completed_at=enrollment.completed_at,
                    created_at=enrollment.created_at,
                    updated_at=enrollment.updated_at,
                    course=to_course_response(enrollment.course)
                    if enrollment.course
                    else None,
                    progress_percentage=progress.progress_percentage,
                    completed_lessons_count=progress.completed_lessons,
                    total_lessons_count=progress.total_lessons,
                    next_lesson_id=resume.next_lesson_id,
                )
            )

        return EnrollmentListResponse(items=items, total=len(items))

    async def get_enrollment_by_id(
        self, current_user: User, enrollment_id: uuid.UUID
    ) -> EnrollmentResponse:
        """Get enrollment details with strict student ownership enforcement."""
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if not enrollment:
            raise ResourceNotFoundError(message="Enrollment not found.")

        if enrollment.user_id != current_user.id:
            user_roles = {r.upper() for r in current_user.role_names}
            if "SUPER_ADMIN" not in user_roles:
                if "ADMIN" in user_roles:
                    student_user = await self.user_repo.get_by_id(enrollment.user_id)
                    if (
                        not student_user
                        or student_user.organization_id is None
                        or student_user.organization_id != current_user.organization_id
                    ):
                        raise ForbiddenError(
                            message="You do not have access to this enrollment record."
                        )
                else:
                    raise ForbiddenError(
                        message="You do not have access to this enrollment record."
                    )

        progress = await self.get_course_progress(
            current_user, enrollment.course_id
        )
        resume = await self.resume_course(current_user, enrollment.course_id)

        return EnrollmentResponse(
            id=enrollment.id,
            user_id=enrollment.user_id,
            course_id=enrollment.course_id,
            status=enrollment.status,
            enrolled_at=enrollment.enrolled_at,
            completed_at=enrollment.completed_at,
            created_at=enrollment.created_at,
            updated_at=enrollment.updated_at,
            course=to_course_response(enrollment.course)
            if enrollment.course
            else None,
            progress_percentage=progress.progress_percentage,
            completed_lessons_count=progress.completed_lessons,
            total_lessons_count=progress.total_lessons,
            next_lesson_id=resume.next_lesson_id,
        )

    async def unenroll_student(
        self, current_user: User, enrollment_id: uuid.UUID
    ) -> None:
        """Unenroll student from a course."""
        enrollment = await self.enrollment_repo.get_by_id(enrollment_id)
        if not enrollment:
            raise ResourceNotFoundError(message="Enrollment not found.")

        if (
            enrollment.user_id != current_user.id
            and not self._is_admin(current_user)
        ):
            raise ForbiddenError(message="You cannot modify this enrollment.")

        enrollment.status = EnrollmentStatus.DROPPED.value
        await self.enrollment_repo.update(enrollment)
        await self.db.commit()

    # -----------------------------------------------------------------------
    # Course Learning View & Content Access
    # -----------------------------------------------------------------------

    async def get_course_learning_view(
        self, current_user: User, course_id: uuid.UUID
    ) -> LearningCourseResponse:
        """Retrieve full curriculum and active lesson progress for an enrolled course."""
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise ResourceNotFoundError(message="Course not found.")

        # Check authorization
        is_owner_or_admin = (
            course.instructor_id == current_user.id or self._is_admin(current_user)
        )
        enrollment = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )

        if not is_owner_or_admin:
            if course.status != CourseStatus.PUBLISHED.value:
                raise ForbiddenError(
                    message="This course is not currently published."
                )

            if not enrollment or enrollment.status not in (
                EnrollmentStatus.ACTIVE.value,
                EnrollmentStatus.COMPLETED.value,
            ):
                raise ForbiddenError(
                    message="Active enrollment required to access course content."
                )

        # Retrieve student lesson progress for this course
        progress_records = await self.progress_repo.list_by_user_and_course(
            current_user.id, course_id
        )
        progress_map = {
            p.lesson_id: p for p in progress_records
        }

        modules_response: list[LearningModuleResponse] = []
        if course.modules:
            for mod in course.modules:
                mod_lessons: list[LearningLessonResponse] = []
                completed_mod_lessons = 0

                if mod.lessons:
                    for les in mod.lessons:
                        p = progress_map.get(les.id)
                        is_completed = bool(p.is_completed) if p else False
                        if is_completed:
                            completed_mod_lessons += 1

                        mod_lessons.append(
                            LearningLessonResponse(
                                id=les.id,
                                module_id=les.module_id,
                                title=les.title,
                                description=les.description,
                                content_type=les.content_type,
                                text_content=les.text_content,
                                resource_url=les.resource_url,
                                duration_minutes=les.duration_minutes,
                                order_index=les.order_index,
                                is_preview=les.is_preview,
                                is_completed=is_completed,
                                completed_at=p.completed_at if p else None,
                                playback_position_seconds=p.playback_position_seconds if p else 0.0,
                                playback_duration_seconds=p.playback_duration_seconds if p else 0.0,
                            )
                        )

                modules_response.append(
                    LearningModuleResponse(
                        id=mod.id,
                        course_id=mod.course_id,
                        title=mod.title,
                        description=mod.description,
                        order_index=mod.order_index,
                        lessons=mod_lessons,
                        completed_lessons_count=completed_mod_lessons,
                        total_lessons_count=len(mod_lessons),
                    )
                )

        progress = await self.get_course_progress(current_user, course_id)

        return LearningCourseResponse(
            id=course.id,
            title=course.title,
            slug=course.slug,
            short_description=course.short_description,
            description=course.description,
            thumbnail_url=course.thumbnail_url,
            difficulty=course.difficulty,
            duration_minutes=course.duration_minutes,
            learning_objectives=course.learning_objectives,
            prerequisites=course.prerequisites,
            modules=modules_response,
            progress=progress,
            enrollment_status=enrollment.status if enrollment else "instructor",
            enrolled_at=enrollment.enrolled_at
            if enrollment
            else course.created_at,
            completed_at=enrollment.completed_at if enrollment else None,
        )

    # -----------------------------------------------------------------------
    # Progress Calculation & Idempotent Updates
    # -----------------------------------------------------------------------

    async def get_course_progress(
        self, current_user: User, course_id: uuid.UUID
    ) -> CourseProgressResponse:
        """Calculate course progress accurately from actual course lessons.

        Progress % = completed lessons / total eligible lessons * 100.
        Safely handles empty courses without division by zero.
        """
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise ResourceNotFoundError(message="Course not found.")

        # Determine all valid lessons currently in the course
        course_lesson_ids: set[uuid.UUID] = set()
        if course.modules:
            for mod in course.modules:
                if mod.lessons:
                    for les in mod.lessons:
                        course_lesson_ids.add(les.id)

        total_lessons = len(course_lesson_ids)

        # Retrieve student progress
        progress_records = await self.progress_repo.list_by_user_and_course(
            current_user.id, course_id
        )

        completed_lesson_ids = [
            p.lesson_id
            for p in progress_records
            if p.is_completed and p.lesson_id in course_lesson_ids
        ]
        completed_count = len(completed_lesson_ids)

        if total_lessons == 0:
            progress_pct = 0.0
        else:
            progress_pct = round((completed_count / total_lessons) * 100.0, 1)

        is_completed = completed_count == total_lessons and total_lessons > 0

        # Auto-update enrollment status if appropriate
        enrollment = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )
        if enrollment:
            if is_completed and enrollment.status == EnrollmentStatus.ACTIVE.value:
                enrollment.status = EnrollmentStatus.COMPLETED.value
                enrollment.completed_at = datetime.now(timezone.utc)
                await self.enrollment_repo.update(enrollment)
                await self.db.commit()
            elif (
                not is_completed
                and enrollment.status == EnrollmentStatus.COMPLETED.value
            ):
                enrollment.status = EnrollmentStatus.ACTIVE.value
                enrollment.completed_at = None
                await self.enrollment_repo.update(enrollment)
                await self.db.commit()

        return CourseProgressResponse(
            course_id=course_id,
            total_lessons=total_lessons,
            completed_lessons=completed_count,
            progress_percentage=progress_pct,
            completed_lesson_ids=completed_lesson_ids,
            is_course_completed=is_completed,
        )

    async def resume_course(
        self, current_user: User, course_id: uuid.UUID
    ) -> ResumeLearningResponse:
        """Identify the next incomplete lesson to seamlessly resume learning."""
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise ResourceNotFoundError(message="Course not found.")

        # Flatten ordered lessons across ordered modules
        ordered_lessons: list[tuple[uuid.UUID, uuid.UUID, str]] = []
        if course.modules:
            for mod in course.modules:
                if mod.lessons:
                    for les in mod.lessons:
                        ordered_lessons.append((mod.id, les.id, les.title))

        total_lessons = len(ordered_lessons)
        if total_lessons == 0:
            return ResumeLearningResponse(
                course_id=course_id,
                next_lesson_id=None,
                next_lesson_title=None,
                next_module_id=None,
                is_completed=False,
                progress_percentage=0.0,
                completed_lessons=0,
                total_lessons=0,
            )

        # Get student's completed lessons
        progress_records = await self.progress_repo.list_by_user_and_course(
            current_user.id, course_id
        )
        completed_ids = {
            p.lesson_id for p in progress_records if p.is_completed
        }

        # Find first lesson not in completed_ids
        next_incomplete = next(
            (
                (m_id, l_id, title)
                for (m_id, l_id, title) in ordered_lessons
                if l_id not in completed_ids
            ),
            None,
        )

        completed_count = len(
            completed_ids & {l_id for _, l_id, _ in ordered_lessons}
        )
        progress_pct = round((completed_count / total_lessons) * 100.0, 1)

        if next_incomplete:
            mod_id, les_id, title = next_incomplete
            active_p = next((p for p in progress_records if p.lesson_id == les_id), None)
            return ResumeLearningResponse(
                course_id=course_id,
                next_lesson_id=les_id,
                next_lesson_title=title,
                next_module_id=mod_id,
                is_completed=False,
                progress_percentage=progress_pct,
                completed_lessons=completed_count,
                total_lessons=total_lessons,
                playback_position_seconds=active_p.playback_position_seconds if active_p else 0.0,
            )

        # All lessons are completed — resume at the last lesson
        last_mod_id, last_les_id, last_title = ordered_lessons[-1]
        last_p = next((p for p in progress_records if p.lesson_id == last_les_id), None)
        return ResumeLearningResponse(
            course_id=course_id,
            next_lesson_id=last_les_id,
            next_lesson_title=last_title,
            next_module_id=last_mod_id,
            is_completed=True,
            progress_percentage=100.0,
            completed_lessons=total_lessons,
            total_lessons=total_lessons,
            playback_position_seconds=last_p.playback_position_seconds if last_p else 0.0,
        )

    async def update_lesson_progress(
        self,
        current_user: User,
        lesson_id: uuid.UUID,
        is_completed: bool | None = None,
        playback_position_seconds: float | None = None,
        playback_duration_seconds: float | None = None,
    ) -> LessonProgressResponse:
        """Idempotently update completion status and video playback progress for a lesson."""
        if playback_position_seconds is not None and playback_position_seconds < 0:
            raise ValidationException(message="Playback position cannot be negative.")
        if playback_duration_seconds is not None and playback_duration_seconds < 0:
            raise ValidationException(message="Playback duration cannot be negative.")
        if (
            playback_position_seconds is not None
            and playback_duration_seconds is not None
            and playback_duration_seconds > 0
            and playback_position_seconds > playback_duration_seconds + 30.0
        ):
            raise ValidationException(message="Playback position exceeds video duration.")

        lesson = await self.course_repo.get_lesson_by_id(lesson_id)
        if not lesson:
            raise ResourceNotFoundError(message="Lesson not found.")

        module = await self.course_repo.get_module_by_id(
            lesson.module_id, include_lessons=False
        )
        if not module:
            raise ResourceNotFoundError(message="Parent module not found.")

        course_id = module.course_id

        # Verify enrollment or authorization
        is_admin_or_instructor = (
            self._is_admin(current_user)
            or SystemRole.INSTRUCTOR.value
            in {r.upper() for r in current_user.role_names}
        )
        enrollment = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )

        if not enrollment and not is_admin_or_instructor:
            raise ForbiddenError(
                message="Active enrollment required to track lesson progress."
            )

        progress = await self.progress_repo.upsert_progress(
            user_id=current_user.id,
            lesson_id=lesson.id,
            course_id=course_id,
            is_completed=is_completed,
            playback_position_seconds=playback_position_seconds,
            playback_duration_seconds=playback_duration_seconds,
        )

        # Trigger course progress recalculation
        await self.get_course_progress(current_user, course_id)
        await self.db.commit()

        return LessonProgressResponse(
            id=progress.id,
            user_id=progress.user_id,
            lesson_id=progress.lesson_id,
            course_id=progress.course_id,
            is_completed=progress.is_completed,
            completed_at=progress.completed_at,
            playback_position_seconds=progress.playback_position_seconds,
            playback_duration_seconds=progress.playback_duration_seconds,
            last_accessed_at=progress.last_accessed_at,
            created_at=progress.created_at,
            updated_at=progress.updated_at,
        )

    async def get_lesson_progress(
        self, current_user: User, lesson_id: uuid.UUID
    ) -> LessonProgressResponse:
        """Retrieve progress record for a single lesson."""
        lesson = await self.course_repo.get_lesson_by_id(lesson_id)
        if not lesson:
            raise ResourceNotFoundError(message="Lesson not found.")

        progress = await self.progress_repo.get_by_user_and_lesson(
            current_user.id, lesson_id
        )

        if not progress:
            module = await self.course_repo.get_module_by_id(
                lesson.module_id, include_lessons=False
            )
            course_id = module.course_id if module else uuid.uuid4()
            now = datetime.now(timezone.utc)
            return LessonProgressResponse(
                id=uuid.uuid4(),
                user_id=current_user.id,
                lesson_id=lesson_id,
                course_id=course_id,
                is_completed=False,
                completed_at=None,
                playback_position_seconds=0.0,
                playback_duration_seconds=0.0,
                last_accessed_at=None,
                created_at=now,
                updated_at=now,
            )

        return LessonProgressResponse(
            id=progress.id,
            user_id=progress.user_id,
            lesson_id=progress.lesson_id,
            course_id=progress.course_id,
            is_completed=progress.is_completed,
            completed_at=progress.completed_at,
            playback_position_seconds=progress.playback_position_seconds,
            playback_duration_seconds=progress.playback_duration_seconds,
            last_accessed_at=progress.last_accessed_at,
            created_at=progress.created_at,
            updated_at=progress.updated_at,
        )

    async def sync_offline_progress(
        self,
        current_user: User,
        course_id: uuid.UUID,
        updates: list[LessonProgressBatchItem],
    ) -> BatchProgressSyncResponse:
        """Idempotently synchronize queued offline progress updates for an enrolled course."""
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise ResourceNotFoundError(message="Course not found.")

        is_admin_or_instructor = (
            self._is_admin(current_user)
            or SystemRole.INSTRUCTOR.value
            in {r.upper() for r in current_user.role_names}
        )
        enrollment = await self.enrollment_repo.get_by_user_and_course(
            current_user.id, course_id
        )
        if not enrollment and not is_admin_or_instructor:
            raise ForbiddenError(
                message="Active enrollment required to synchronize progress."
            )

        # Collect valid lesson IDs in this course
        valid_lesson_ids: set[uuid.UUID] = set()
        if course.modules:
            for m in course.modules:
                if m.lessons:
                    for l in m.lessons:
                        valid_lesson_ids.add(l.id)

        synced_count = 0
        for item in updates:
            if item.lesson_id not in valid_lesson_ids:
                continue
            if item.playback_position_seconds is not None and item.playback_position_seconds < 0:
                continue
            if item.playback_duration_seconds is not None and item.playback_duration_seconds < 0:
                continue

            await self.progress_repo.upsert_progress(
                user_id=current_user.id,
                lesson_id=item.lesson_id,
                course_id=course_id,
                is_completed=item.is_completed,
                playback_position_seconds=item.playback_position_seconds,
                playback_duration_seconds=item.playback_duration_seconds,
            )
            synced_count += 1

        # Recalculate course progress
        course_progress = await self.get_course_progress(current_user, course_id)
        await self.db.commit()

        return BatchProgressSyncResponse(
            course_id=course_id,
            synced_count=synced_count,
            progress=course_progress,
        )

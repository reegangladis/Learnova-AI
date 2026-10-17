import uuid
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.errors import AppExceptions
from backend.app.core.rbac import SystemPermission, SystemRole
from backend.app.models.course import (
    ContentProcessingStatus,
    Course,
    CourseCategory,
    CourseModule,
    CourseStatus,
    Lesson,
    LessonContentType,
)
from backend.app.models.user import User
from backend.app.repositories.ai_repo import AIRepository
from backend.app.repositories.category_repo import CategoryRepository
from backend.app.repositories.course_repo import CourseRepository
from backend.app.schemas.course import (
    CourseCategoryCreate,
    CourseCategoryUpdate,
    CourseCreate,
    CourseUpdate,
    LessonCreate,
    LessonUpdate,
    ModuleCreate,
    ModuleUpdate,
    slugify,
)
from backend.app.services.storage_service import storage_service


class CourseService:
    """Service orchestrating course authoring, publication, modules, and lessons."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.course_repo = CourseRepository(db)
        self.category_repo = CategoryRepository(db)

    # -----------------------------------------------------------------------
    # Authorization Helpers
    # -----------------------------------------------------------------------

    def _is_super_admin(self, user: User | None) -> bool:
        if not user:
            return False
        return SystemRole.SUPER_ADMIN.value in [r.upper() for r in user.role_names]

    def _is_admin(self, user: User | None) -> bool:
        if not user:
            return False
        roles = {r.upper() for r in user.role_names}
        return (
            SystemRole.ADMIN.value in roles
            or SystemRole.SUPER_ADMIN.value in roles
        )

    def can_view_course(self, course: Course, current_user: User | None) -> bool:
        """Determines if the current user/visitor can view the course."""
        if course.status == CourseStatus.PUBLISHED.value:
            return True

        if not current_user:
            return False

        if self._is_super_admin(current_user):
            return True

        if self._is_admin(current_user):
            # Check organization isolation if course has an organization
            if course.organization_id is not None:
                return course.organization_id == current_user.organization_id
            return current_user.organization_id is None

        # Instructors can view their own draft/archived courses
        return current_user.id == course.instructor_id

    def assert_write_access(self, course: Course, current_user: User) -> None:
        """Asserts that the current user has permission to modify the course."""
        if self._is_super_admin(current_user):
            return

        user_roles = {r.upper() for r in current_user.role_names}
        user_perms = {p.upper() for p in current_user.permission_codes}

        if SystemRole.ADMIN.value in user_roles:
            if course.organization_id is not None:
                if course.organization_id != current_user.organization_id:
                    raise AppExceptions.ForbiddenException(
                        message="Cannot manage courses belonging to a different organization."
                    )
            elif current_user.organization_id is not None:
                raise AppExceptions.ForbiddenException(
                    message="Cannot manage courses belonging to a different organization."
                )
            return

        if (
            SystemRole.INSTRUCTOR.value in user_roles
            or SystemPermission.COURSE_UPDATE.value in user_perms
        ):
            if current_user.id != course.instructor_id:
                raise AppExceptions.ForbiddenException(
                    message="Instructors can only manage courses they own."
                )
            return

        raise AppExceptions.ForbiddenException(
            message="Insufficient privileges to modify this course."
        )

    # -----------------------------------------------------------------------
    # Course Slug Management
    # -----------------------------------------------------------------------

    async def _generate_unique_course_slug(
        self, base_title: str, existing_course_id: uuid.UUID | None = None
    ) -> str:
        base_slug = slugify(base_title) or "course"
        slug = base_slug
        counter = 1

        while True:
            existing = await self.course_repo.get_by_slug(slug)
            if not existing or (
                existing_course_id and existing.id == existing_course_id
            ):
                return slug
            counter += 1
            slug = f"{base_slug}-{counter}"

    # -----------------------------------------------------------------------
    # Course CRUD
    # -----------------------------------------------------------------------

    async def create_course(
        self, data: CourseCreate, current_user: User
    ) -> Course:
        # Verify user has creation rights
        user_roles = {r.upper() for r in current_user.role_names}
        user_perms = {p.upper() for p in current_user.permission_codes}

        can_create = (
            self._is_admin(current_user)
            or SystemRole.INSTRUCTOR.value in user_roles
            or SystemPermission.COURSE_CREATE.value in user_perms
        )
        if not can_create:
            raise AppExceptions.ForbiddenException(
                message="Students and unauthorized users cannot create courses."
            )

        # Validate category if provided
        if data.category_id:
            category = await self.category_repo.get_by_id(data.category_id)
            if not category or not category.is_active:
                raise AppExceptions.ValidationException(
                    message="Selected course category is invalid or inactive."
                )

        slug = await self._generate_unique_course_slug(data.slug or data.title)

        course = Course(
            instructor_id=current_user.id,
            organization_id=current_user.organization_id,
            category_id=data.category_id,
            title=data.title.strip(),
            slug=slug,
            short_description=data.short_description.strip(),
            description=data.description.strip(),
            thumbnail_url=data.thumbnail_url,
            difficulty=data.difficulty.value,
            duration_minutes=data.duration_minutes,
            learning_objectives=data.learning_objectives,
            prerequisites=data.prerequisites,
            status=CourseStatus.DRAFT.value,
            language=data.language or "en",
        )
        created = await self.course_repo.create(course)
        await self.db.commit()
        return await self.course_repo.get_by_id(created.id, include_modules=True)

    async def get_course_detail(
        self, course_id: uuid.UUID, current_user: User | None
    ) -> Course:
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        if not self.can_view_course(course, current_user):
            raise AppExceptions.ForbiddenException(
                message="You do not have permission to view this unpublished course."
            )

        return course

    async def list_courses(
        self,
        current_user: User | None,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        category_id: uuid.UUID | None = None,
        difficulty: str | None = None,
        status: str | None = None,
        instructor_id: uuid.UUID | None = None,
        sort_by: str = "created_at",
        sort_order: Literal["asc", "desc"] = "desc",
    ) -> tuple[list[Course], int]:
        # Filter visibility according to authorization
        effective_status = status

        if not current_user:
            # Anonymous users can ONLY see published courses
            effective_status = CourseStatus.PUBLISHED.value
        else:
            is_staff = self._is_admin(current_user)
            is_self_instructor = (
                instructor_id is not None and instructor_id == current_user.id
            )

            # If user is not staff and not requesting their own instructor courses, force published only
            if not is_staff and not is_self_instructor:
                effective_status = CourseStatus.PUBLISHED.value

        courses, total = await self.course_repo.list_courses(
            page=page,
            page_size=page_size,
            search=search,
            category_id=category_id,
            difficulty=difficulty,
            status=effective_status,
            instructor_id=instructor_id,
            sort_by=sort_by,
            sort_order=sort_order,
        )
        return courses, total

    async def update_course(
        self, course_id: uuid.UUID, data: CourseUpdate, current_user: User
    ) -> Course:
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        self.assert_write_access(course, current_user)

        if data.category_id is not None:
            category = await self.category_repo.get_by_id(data.category_id)
            if not category or not category.is_active:
                raise AppExceptions.ValidationException(
                    message="Selected course category is invalid or inactive."
                )
            course.category_id = data.category_id

        if data.title is not None:
            course.title = data.title.strip()

        if data.slug is not None:
            course.slug = await self._generate_unique_course_slug(
                data.slug, existing_course_id=course.id
            )

        if data.short_description is not None:
            course.short_description = data.short_description.strip()

        if data.description is not None:
            course.description = data.description.strip()

        if data.thumbnail_url is not None:
            course.thumbnail_url = data.thumbnail_url

        if data.difficulty is not None:
            course.difficulty = data.difficulty.value

        if data.duration_minutes is not None:
            course.duration_minutes = data.duration_minutes

        if data.learning_objectives is not None:
            course.learning_objectives = data.learning_objectives

        if data.prerequisites is not None:
            course.prerequisites = data.prerequisites

        if data.language is not None:
            course.language = data.language

        await self.course_repo.update(course)
        await self.db.commit()
        return await self.course_repo.get_by_id(course.id, include_modules=True)

    async def delete_course(
        self, course_id: uuid.UUID, current_user: User
    ) -> None:
        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        self.assert_write_access(course, current_user)

        # Purge any RAG document chunks before deletion
        ai_repo = AIRepository(self.db)
        await ai_repo.delete_chunks_for_course(course.id)

        # Explicit deletion
        await self.course_repo.delete(course)
        await self.db.commit()

    async def archive_course(
        self, course_id: uuid.UUID, current_user: User
    ) -> Course:
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        self.assert_write_access(course, current_user)
        course.status = CourseStatus.ARCHIVED.value
        await self.course_repo.update(course)
        await self.db.commit()
        return course

    # -----------------------------------------------------------------------
    # Publication Workflow
    # -----------------------------------------------------------------------

    async def publish_course(
        self, course_id: uuid.UUID, current_user: User
    ) -> Course:
        course = await self.course_repo.get_by_id(course_id, include_modules=True)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        self.assert_write_access(course, current_user)

        # Check permission to publish
        user_perms = {p.upper() for p in current_user.permission_codes}
        if (
            not self._is_admin(current_user)
            and SystemPermission.COURSE_PUBLISH.value not in user_perms
        ):
            raise AppExceptions.ForbiddenException(
                message="You lack permission to publish courses."
            )

        # Completeness validation rules (Section 5)
        errors: list[str] = []

        if not course.title or len(course.title.strip()) < 3:
            errors.append("Course title must be at least 3 characters.")

        if (
            not course.short_description
            or len(course.short_description.strip()) < 10
        ):
            errors.append("Short description must be at least 10 characters.")

        if not course.description or len(course.description.strip()) < 10:
            errors.append("Full description must be at least 10 characters.")

        if not course.category_id:
            errors.append("A course category must be assigned.")
        else:
            cat = await self.category_repo.get_by_id(course.category_id)
            if not cat or not cat.is_active:
                errors.append("Assigned course category is invalid or inactive.")

        if not course.instructor_id:
            errors.append("An instructor must be assigned to the course.")

        modules = await self.course_repo.get_modules_by_course(course.id)
        if not modules:
            errors.append("Course must contain at least one instructional module.")
        else:
            total_lessons = 0
            for mod_idx, mod in enumerate(modules, 1):
                if not mod.title or not mod.title.strip():
                    errors.append(f"Module #{mod_idx} must have a valid title.")

                if not mod.lessons:
                    errors.append(f"Module '{mod.title}' contains no lessons.")

                for les_idx, les in enumerate(mod.lessons, 1):
                    total_lessons += 1
                    if not les.title or not les.title.strip():
                        errors.append(
                            f"Lesson #{les_idx} in module '{mod.title}' has no title."
                        )

                    # Validate required lesson content by type
                    if les.content_type == LessonContentType.TEXT.value:
                        if not les.text_content or not les.text_content.strip():
                            errors.append(
                                f"Text lesson '{les.title}' requires non-empty text content."
                            )
                    elif (
                        les.content_type in (
                            LessonContentType.VIDEO.value,
                            LessonContentType.PDF.value,
                            LessonContentType.EXTERNAL_RESOURCE.value,
                        )
                        and (
                            not les.resource_url
                            or not storage_service.validate_reference(
                                les.resource_url, les.content_type
                            )
                        )
                    ):
                        errors.append(
                            f"{les.content_type.capitalize()} lesson '{les.title}' requires a valid resource URL reference."
                        )


            if total_lessons == 0:
                errors.append("Course must contain at least one lesson.")

        if errors:
            raise AppExceptions.ValidationException(
                message="Course does not satisfy publication completeness requirements.",
                details={"errors": errors},
            )

        course.status = CourseStatus.PUBLISHED.value
        course.published_at = datetime.now(timezone.utc)
        await self.course_repo.update(course)
        await self.db.commit()
        return course

    # -----------------------------------------------------------------------
    # Module Management
    # -----------------------------------------------------------------------

    async def get_course_modules(
        self, course_id: uuid.UUID, current_user: User | None
    ) -> list[CourseModule]:
        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        if not self.can_view_course(course, current_user):
            raise AppExceptions.ForbiddenException(
                message="Cannot view modules of an unpublished course."
            )

        return await self.course_repo.get_modules_by_course(course_id)

    async def create_module(
        self, course_id: uuid.UUID, data: ModuleCreate, current_user: User
    ) -> CourseModule:
        course = await self.course_repo.get_by_id(course_id)
        if not course:
            raise AppExceptions.NotFoundException(message="Course not found.")

        self.assert_write_access(course, current_user)

        module = CourseModule(
            course_id=course_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            order_index=data.order_index or 0,
        )
        created = await self.course_repo.create_module(module)
        await self.db.commit()
        return await self.course_repo.get_module_by_id(created.id)

    async def update_module(
        self, module_id: uuid.UUID, data: ModuleUpdate, current_user: User
    ) -> CourseModule:
        module = await self.course_repo.get_module_by_id(module_id)
        if not module:
            raise AppExceptions.NotFoundException(message="Module not found.")

        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        if data.title is not None:
            module.title = data.title.strip()
        if data.description is not None:
            module.description = data.description.strip()
        if data.order_index is not None:
            module.order_index = data.order_index

        await self.course_repo.update_module(module)
        await self.db.commit()
        return module

    async def delete_module(
        self, module_id: uuid.UUID, current_user: User
    ) -> None:
        module = await self.course_repo.get_module_by_id(module_id)
        if not module:
            raise AppExceptions.NotFoundException(message="Module not found.")

        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        await self.course_repo.delete_module(module)
        await self.db.commit()

    async def reorder_module(
        self, module_id: uuid.UUID, target_order: int, current_user: User
    ) -> CourseModule:
        module = await self.course_repo.get_module_by_id(module_id)
        if not module:
            raise AppExceptions.NotFoundException(message="Module not found.")

        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        reordered = await self.course_repo.reorder_module(
            course.id, module_id, target_order
        )
        await self.db.commit()
        return reordered

    # -----------------------------------------------------------------------
    # Lesson Management
    # -----------------------------------------------------------------------

    async def create_lesson(
        self, module_id: uuid.UUID, data: LessonCreate, current_user: User
    ) -> Lesson:
        module = await self.course_repo.get_module_by_id(module_id)
        if not module:
            raise AppExceptions.NotFoundException(message="Module not found.")

        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        # Validate resource URL if provided
        if data.resource_url and not storage_service.validate_reference(
            data.resource_url, data.content_type
        ):
            raise AppExceptions.ValidationException(
                message="Invalid resource URL reference provided."
            )


        lesson = Lesson(
            module_id=module_id,
            title=data.title.strip(),
            description=data.description.strip() if data.description else None,
            content_type=data.content_type.value,
            text_content=data.text_content,
            resource_url=data.resource_url,
            duration_minutes=data.duration_minutes,
            order_index=data.order_index or 0,
            is_preview=data.is_preview,
            metadata_json=data.metadata_json,
        )
        created = await self.course_repo.create_lesson(lesson)
        await self.db.commit()
        return await self.course_repo.get_lesson_by_id(created.id)

    async def update_lesson(
        self, lesson_id: uuid.UUID, data: LessonUpdate, current_user: User
    ) -> Lesson:
        lesson = await self.course_repo.get_lesson_by_id(lesson_id)
        if not lesson:
            raise AppExceptions.NotFoundException(message="Lesson not found.")

        module = await self.course_repo.get_module_by_id(lesson.module_id)
        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        target_content_type = (
            data.content_type.value if data.content_type else lesson.content_type
        )
        if data.resource_url is not None:
            if data.resource_url and not storage_service.validate_reference(
                data.resource_url, target_content_type
            ):
                raise AppExceptions.ValidationException(
                    message="Invalid resource URL reference provided."
                )
            lesson.resource_url = data.resource_url

        content_changed = False
        if data.title is not None:
            lesson.title = data.title.strip()
        if data.description is not None:
            lesson.description = data.description.strip()
        if data.content_type is not None:
            if lesson.content_type != data.content_type.value:
                content_changed = True
            lesson.content_type = data.content_type.value
        if data.text_content is not None:
            if lesson.text_content != data.text_content:
                content_changed = True
            lesson.text_content = data.text_content
        if data.duration_minutes is not None:
            lesson.duration_minutes = data.duration_minutes
        if data.order_index is not None:
            lesson.order_index = data.order_index
        if data.is_preview is not None:
            lesson.is_preview = data.is_preview
        if data.metadata_json is not None:
            lesson.metadata_json = data.metadata_json

        if content_changed:
            # Purge stale RAG document chunks immediately so outdated content cannot be retrieved
            ai_repo = AIRepository(self.db)
            await ai_repo.delete_chunks_for_lesson(lesson.id)
            lesson.content_processing_status = ContentProcessingStatus.PENDING.value
            lesson.text_extraction_status = ContentProcessingStatus.PENDING.value

        await self.course_repo.update_lesson(lesson)
        await self.db.commit()
        return lesson

    async def delete_lesson(
        self, lesson_id: uuid.UUID, current_user: User
    ) -> None:
        lesson = await self.course_repo.get_lesson_by_id(lesson_id)
        if not lesson:
            raise AppExceptions.NotFoundException(message="Lesson not found.")

        module = await self.course_repo.get_module_by_id(lesson.module_id)
        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        # Purge associated RAG chunks to prevent stale retrievable material
        ai_repo = AIRepository(self.db)
        await ai_repo.delete_chunks_for_lesson(lesson.id)

        await self.course_repo.delete_lesson(lesson)
        await self.db.commit()

    async def reorder_lesson(
        self, lesson_id: uuid.UUID, target_order: int, current_user: User
    ) -> Lesson:
        lesson = await self.course_repo.get_lesson_by_id(lesson_id)
        if not lesson:
            raise AppExceptions.NotFoundException(message="Lesson not found.")

        module = await self.course_repo.get_module_by_id(lesson.module_id)
        course = await self.course_repo.get_by_id(module.course_id)
        self.assert_write_access(course, current_user)

        reordered = await self.course_repo.reorder_lesson(
            module.id, lesson_id, target_order
        )
        await self.db.commit()
        return reordered

    # -----------------------------------------------------------------------
    # Category Management (Admin)
    # -----------------------------------------------------------------------

    async def list_categories(
        self, active_only: bool = True
    ) -> list[CourseCategory]:
        return await self.category_repo.list_categories(active_only=active_only)

    async def create_category(
        self, data: CourseCategoryCreate, current_user: User
    ) -> CourseCategory:
        if not self._is_admin(current_user):
            raise AppExceptions.ForbiddenException(
                message="Only administrators can manage course categories."
            )

        slug = data.slug or slugify(data.name)
        existing = await self.category_repo.get_by_slug(slug)
        if existing:
            raise AppExceptions.ValidationException(
                message=f"Category with slug '{slug}' already exists."
            )

        category = CourseCategory(
            name=data.name.strip(),
            slug=slug,
            description=data.description.strip() if data.description else None,
            is_active=data.is_active,
        )
        created = await self.category_repo.create(category)
        await self.db.commit()
        return created

    async def update_category(
        self,
        category_id: uuid.UUID,
        data: CourseCategoryUpdate,
        current_user: User,
    ) -> CourseCategory:
        if not self._is_admin(current_user):
            raise AppExceptions.ForbiddenException(
                message="Only administrators can manage course categories."
            )

        category = await self.category_repo.get_by_id(category_id)
        if not category:
            raise AppExceptions.NotFoundException(message="Category not found.")

        if data.name is not None:
            category.name = data.name.strip()
        if data.slug is not None:
            existing = await self.category_repo.get_by_slug(data.slug)
            if existing and existing.id != category.id:
                raise AppExceptions.ValidationException(
                    message=f"Category with slug '{data.slug}' already exists."
                )
            category.slug = data.slug
        if data.description is not None:
            category.description = data.description.strip()
        if data.is_active is not None:
            category.is_active = data.is_active

        await self.category_repo.update(category)
        await self.db.commit()
        return category

    async def delete_category(
        self, category_id: uuid.UUID, current_user: User
    ) -> None:
        if not self._is_admin(current_user):
            raise AppExceptions.ForbiddenException(
                message="Only administrators can manage course categories."
            )

        category = await self.category_repo.get_by_id(category_id)
        if not category:
            raise AppExceptions.NotFoundException(message="Category not found.")

        await self.category_repo.delete(category)
        await self.db.commit()

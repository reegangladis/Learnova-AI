import uuid
from typing import Literal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.course import Course, CourseModule, Lesson


class CourseRepository:
    """Repository handling database access for Courses, Modules, and Lessons."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # -----------------------------------------------------------------------
    # Courses
    # -----------------------------------------------------------------------

    async def get_by_id(
        self, course_id: uuid.UUID, include_modules: bool = False
    ) -> Course | None:
        query = (
            select(Course)
            .where(Course.id == course_id)
            .options(
                selectinload(Course.category),
                selectinload(Course.instructor),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        course = result.scalar_one_or_none()
        if course and include_modules:
            course.modules = await self.get_modules_by_course(course.id)
        return course

    async def get_by_slug(
        self, slug: str, include_modules: bool = False
    ) -> Course | None:
        query = (
            select(Course)
            .where(Course.slug == slug)
            .options(
                selectinload(Course.category),
                selectinload(Course.instructor),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        course = result.scalar_one_or_none()
        if course and include_modules:
            course.modules = await self.get_modules_by_course(course.id)
        return course

    async def list_courses(
        self,
        page: int = 1,
        page_size: int = 20,
        search: str | None = None,
        category_id: uuid.UUID | None = None,
        difficulty: str | None = None,
        status: str | None = None,
        instructor_id: uuid.UUID | None = None,
        organization_id: uuid.UUID | None = None,
        allow_global: bool = True,
        is_super_admin: bool = False,
        sort_by: str = "created_at",
        sort_order: Literal["asc", "desc"] = "desc",
    ) -> tuple[list[Course], int]:
        query = select(Course).options(
            selectinload(Course.category),
            selectinload(Course.instructor),
            selectinload(Course.modules),
        )

        if search:
            search_term = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Course.title.ilike(search_term),
                    Course.short_description.ilike(search_term),
                    Course.description.ilike(search_term),
                )
            )

        if category_id:
            query = query.where(Course.category_id == category_id)

        if difficulty:
            query = query.where(Course.difficulty == difficulty.lower())

        if status:
            query = query.where(Course.status == status.lower())

        if instructor_id:
            query = query.where(Course.instructor_id == instructor_id)

        if not is_super_admin:
            if organization_id is not None:
                if allow_global:
                    query = query.where(
                        or_(
                            Course.organization_id == organization_id,
                            Course.organization_id.is_(None),
                        )
                    )
                else:
                    query = query.where(Course.organization_id == organization_id)
            else:
                # Unaffiliated / anonymous users can only see global courses
                query = query.where(Course.organization_id.is_(None))

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Sorting
        sort_column = getattr(Course, sort_by, Course.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        courses = list(result.scalars().all())
        return courses, total

    async def create(self, course: Course) -> Course:
        self.db.add(course)
        await self.db.flush()
        return course

    async def update(self, course: Course) -> Course:
        await self.db.flush()
        return course

    async def delete(self, course: Course) -> None:
        await self.db.delete(course)
        await self.db.flush()

    # -----------------------------------------------------------------------
    # Course Modules
    # -----------------------------------------------------------------------

    async def get_module_by_id(
        self, module_id: uuid.UUID, include_lessons: bool = True
    ) -> CourseModule | None:
        query = (
            select(CourseModule)
            .where(CourseModule.id == module_id)
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        module = result.scalar_one_or_none()
        if module and include_lessons:
            module.lessons = await self.get_lessons_by_module(module.id)
        return module

    async def get_modules_by_course(
        self, course_id: uuid.UUID
    ) -> list[CourseModule]:
        query = (
            select(CourseModule)
            .where(CourseModule.course_id == course_id)
            .order_by(CourseModule.order_index.asc())
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        modules = list(result.scalars().all())
        for mod in modules:
            mod.lessons = await self.get_lessons_by_module(mod.id)
        return modules

    async def create_module(self, module: CourseModule) -> CourseModule:
        # If order_index not set, place at end
        if module.order_index is None or module.order_index == 0:
            count_res = await self.db.execute(
                select(func.count()).where(CourseModule.course_id == module.course_id)
            )
            module.order_index = count_res.scalar() or 0
        self.db.add(module)
        await self.db.flush()
        return module

    async def update_module(self, module: CourseModule) -> CourseModule:
        await self.db.flush()
        return module

    async def delete_module(self, module: CourseModule) -> None:
        course_id = module.course_id
        await self.db.delete(module)
        await self.db.flush()

        # Re-compact subsequent modules
        modules = await self.get_modules_by_course(course_id)
        for idx, mod in enumerate(modules):
            if mod.order_index != idx:
                mod.order_index = idx
        await self.db.flush()

    async def reorder_module(
        self, course_id: uuid.UUID, module_id: uuid.UUID, target_order: int
    ) -> CourseModule | None:
        modules = await self.get_modules_by_course(course_id)
        current_mod = next((m for m in modules if m.id == module_id), None)
        if not current_mod:
            return None

        # Remove from current list and insert at target_order
        modules = [m for m in modules if m.id != module_id]
        target_order = max(0, min(target_order, len(modules)))
        modules.insert(target_order, current_mod)

        # Update order_index for all
        for idx, mod in enumerate(modules):
            mod.order_index = idx

        await self.db.flush()
        return current_mod

    # -----------------------------------------------------------------------
    # Lessons
    # -----------------------------------------------------------------------

    async def get_lesson_by_id(self, lesson_id: uuid.UUID) -> Lesson | None:
        result = await self.db.execute(
            select(Lesson)
            .where(Lesson.id == lesson_id)
            .options(selectinload(Lesson.module))
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    async def get_lessons_by_module(
        self, module_id: uuid.UUID
    ) -> list[Lesson]:
        query = (
            select(Lesson)
            .where(Lesson.module_id == module_id)
            .order_by(Lesson.order_index.asc())
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_lesson(self, lesson: Lesson) -> Lesson:
        if lesson.order_index is None or lesson.order_index == 0:
            count_res = await self.db.execute(
                select(func.count()).where(Lesson.module_id == lesson.module_id)
            )
            lesson.order_index = count_res.scalar() or 0
        self.db.add(lesson)
        await self.db.flush()
        return lesson

    async def update_lesson(self, lesson: Lesson) -> Lesson:
        await self.db.flush()
        return lesson

    async def delete_lesson(self, lesson: Lesson) -> None:
        module_id = lesson.module_id
        await self.db.delete(lesson)
        await self.db.flush()

        # Re-compact subsequent lessons
        lessons = await self.get_lessons_by_module(module_id)
        for idx, les in enumerate(lessons):
            if les.order_index != idx:
                les.order_index = idx
        await self.db.flush()

    async def reorder_lesson(
        self, module_id: uuid.UUID, lesson_id: uuid.UUID, target_order: int
    ) -> Lesson | None:
        lessons = await self.get_lessons_by_module(module_id)
        current_lesson = next((l for l in lessons if l.id == lesson_id), None)
        if not current_lesson:
            return None

        lessons = [l for l in lessons if l.id != lesson_id]
        target_order = max(0, min(target_order, len(lessons)))
        lessons.insert(target_order, current_lesson)

        for idx, les in enumerate(lessons):
            les.order_index = idx

        await self.db.flush()
        return current_lesson

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.course import Course
from backend.app.models.enrollment import Enrollment


class EnrollmentRepository:
    """Repository handling database access for student course enrollments."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, enrollment_id: uuid.UUID) -> Enrollment | None:
        query = (
            select(Enrollment)
            .where(Enrollment.id == enrollment_id)
            .options(
                selectinload(Enrollment.course).selectinload(Course.category),
                selectinload(Enrollment.course).selectinload(Course.instructor),
                selectinload(Enrollment.user),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_user_and_course(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> Enrollment | None:
        query = (
            select(Enrollment)
            .where(
                Enrollment.user_id == user_id,
                Enrollment.course_id == course_id,
            )
            .options(
                selectinload(Enrollment.course).selectinload(Course.category),
                selectinload(Enrollment.course).selectinload(Course.instructor),
                selectinload(Enrollment.user),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: uuid.UUID, status: str | None = None
    ) -> list[Enrollment]:
        query = (
            select(Enrollment)
            .where(Enrollment.user_id == user_id)
            .options(
                selectinload(Enrollment.course).selectinload(Course.category),
                selectinload(Enrollment.course).selectinload(Course.instructor),
                selectinload(Enrollment.user),
            )
            .order_by(Enrollment.enrolled_at.desc())
            .execution_options(populate_existing=True)
        )
        if status:
            query = query.where(Enrollment.status == status)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, enrollment: Enrollment) -> Enrollment:
        self.db.add(enrollment)
        await self.db.flush()
        return enrollment

    async def update(self, enrollment: Enrollment) -> Enrollment:
        await self.db.flush()
        return enrollment

    async def delete(self, enrollment: Enrollment) -> None:
        await self.db.delete(enrollment)
        await self.db.flush()

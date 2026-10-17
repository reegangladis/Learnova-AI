import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.course import CourseCategory


class CategoryRepository:
    """Repository handling database access for CourseCategory entities."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, category_id: uuid.UUID) -> CourseCategory | None:
        result = await self.db.execute(
            select(CourseCategory).where(CourseCategory.id == category_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> CourseCategory | None:
        result = await self.db.execute(
            select(CourseCategory).where(CourseCategory.slug == slug)
        )
        return result.scalar_one_or_none()

    async def list_categories(
        self, active_only: bool = True
    ) -> list[CourseCategory]:
        query = select(CourseCategory)
        if active_only:
            query = query.where(CourseCategory.is_active.is_(True))
        query = query.order_by(CourseCategory.name.asc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create(self, category: CourseCategory) -> CourseCategory:
        self.db.add(category)
        await self.db.flush()
        return category

    async def update(self, category: CourseCategory) -> CourseCategory:
        await self.db.flush()
        return category

    async def delete(self, category: CourseCategory) -> None:
        await self.db.delete(category)
        await self.db.flush()

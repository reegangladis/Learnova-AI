import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.enrollment import LessonProgress


class ProgressRepository:
    """Repository handling database access for lesson progress tracking."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_user_and_lesson(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> LessonProgress | None:
        query = (
            select(LessonProgress)
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.lesson_id == lesson_id,
            )
            .options(
                selectinload(LessonProgress.lesson),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_by_user_and_course(
        self, user_id: uuid.UUID, course_id: uuid.UUID
    ) -> list[LessonProgress]:
        query = (
            select(LessonProgress)
            .where(
                LessonProgress.user_id == user_id,
                LessonProgress.course_id == course_id,
            )
            .options(
                selectinload(LessonProgress.lesson),
            )
            .execution_options(populate_existing=True)
        )
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def upsert_progress(
        self,
        user_id: uuid.UUID,
        lesson_id: uuid.UUID,
        course_id: uuid.UUID,
        is_completed: bool | None = None,
        playback_position_seconds: float | None = None,
        playback_duration_seconds: float | None = None,
    ) -> LessonProgress:
        """Idempotently record or update a student's completion status and video playback progress."""
        existing = await self.get_by_user_and_lesson(user_id, lesson_id)
        now = datetime.now(timezone.utc)

        if existing:
            if is_completed is not None:
                existing.is_completed = is_completed
                if is_completed:
                    if not existing.completed_at:
                        existing.completed_at = now
                else:
                    existing.completed_at = None
            if playback_position_seconds is not None:
                existing.playback_position_seconds = playback_position_seconds
            if playback_duration_seconds is not None:
                existing.playback_duration_seconds = playback_duration_seconds
            existing.last_accessed_at = now
            existing.course_id = course_id  # ensure sync
            await self.db.flush()
            return existing

        completed_flag = bool(is_completed) if is_completed is not None else False
        progress = LessonProgress(
            user_id=user_id,
            lesson_id=lesson_id,
            course_id=course_id,
            is_completed=completed_flag,
            completed_at=now if completed_flag else None,
            playback_position_seconds=playback_position_seconds if playback_position_seconds is not None else 0.0,
            playback_duration_seconds=playback_duration_seconds if playback_duration_seconds is not None else 0.0,
            last_accessed_at=now,
        )
        self.db.add(progress)
        await self.db.flush()
        return progress

    async def delete_by_user_and_lesson(
        self, user_id: uuid.UUID, lesson_id: uuid.UUID
    ) -> None:
        existing = await self.get_by_user_and_lesson(user_id, lesson_id)
        if existing:
            await self.db.delete(existing)
            await self.db.flush()

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.ai import (
    AIConversation,
    AIMessage,
    DocumentChunk,
    IngestionJob,
    IngestionStatus,
)


class AIRepository:
    """Repository handling database operations for AI conversations, messages, and RAG document chunks."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # =========================================================================
    # Conversation Management
    # =========================================================================

    async def create_conversation(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        lesson_id: uuid.UUID | None = None,
        title: str = "New Conversation",
    ) -> AIConversation:
        conversation = AIConversation(
            id=uuid.uuid4(),
            user_id=user_id,
            course_id=course_id,
            lesson_id=lesson_id,
            title=title,
        )
        self.db.add(conversation)
        await self.db.flush()
        await self.db.refresh(conversation)
        return conversation

    async def get_conversation(
        self, conversation_id: uuid.UUID
    ) -> AIConversation | None:
        stmt = (
            select(AIConversation)
            .options(
                selectinload(AIConversation.messages),
                selectinload(AIConversation.course),
                selectinload(AIConversation.lesson),
            )
            .where(AIConversation.id == conversation_id)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def list_conversations_for_user(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[AIConversation]:
        stmt = (
            select(AIConversation)
            .options(
                selectinload(AIConversation.messages),
                selectinload(AIConversation.course),
                selectinload(AIConversation.lesson),
            )
            .where(AIConversation.user_id == user_id)
        )
        if course_id:
            stmt = stmt.where(AIConversation.course_id == course_id)
        stmt = stmt.order_by(AIConversation.updated_at.desc()).offset(offset).limit(limit)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_conversation(self, conversation: AIConversation) -> None:
        await self.db.delete(conversation)
        await self.db.flush()

    # =========================================================================
    # Message Management
    # =========================================================================

    async def create_message(
        self,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        sources: list[dict] | None = None,
        is_grounded: bool = False,
        model: str | None = None,
        tokens_used: int | None = None,
    ) -> AIMessage:
        message = AIMessage(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources or [],
            is_grounded=is_grounded,
            model=model,
            tokens_used=tokens_used,
        )
        self.db.add(message)
        # Touch parent conversation's updated_at
        stmt = (
            select(AIConversation)
            .where(AIConversation.id == conversation_id)
        )
        res = await self.db.execute(stmt)
        conv = res.scalars().first()
        if conv:
            conv.updated_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(message)
        return message

    async def list_messages_for_conversation(
        self, conversation_id: uuid.UUID
    ) -> list[AIMessage]:
        stmt = (
            select(AIMessage)
            .where(AIMessage.conversation_id == conversation_id)
            .order_by(AIMessage.created_at.asc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # =========================================================================
    # Document Chunks (RAG Index)
    # =========================================================================

    async def delete_chunks_for_lesson(self, lesson_id: uuid.UUID) -> int:
        stmt = delete(DocumentChunk).where(DocumentChunk.lesson_id == lesson_id)
        res = await self.db.execute(stmt)
        await self.db.flush()
        return res.rowcount or 0

    async def delete_chunks_for_course(self, course_id: uuid.UUID) -> int:
        stmt = delete(DocumentChunk).where(DocumentChunk.course_id == course_id)
        res = await self.db.execute(stmt)
        await self.db.flush()
        return res.rowcount or 0

    async def add_chunks(self, chunks: list[DocumentChunk]) -> None:
        for c in chunks:
            self.db.add(c)
        await self.db.flush()

    async def get_chunks_for_course(
        self,
        course_id: uuid.UUID,
        lesson_id: uuid.UUID | None = None,
        organization_id: uuid.UUID | None = None,
    ) -> list[DocumentChunk]:
        stmt = select(DocumentChunk).where(DocumentChunk.course_id == course_id)
        if lesson_id:
            stmt = stmt.where(DocumentChunk.lesson_id == lesson_id)
        if organization_id:
            stmt = stmt.where(DocumentChunk.organization_id == organization_id)
        stmt = stmt.order_by(DocumentChunk.chunk_index.asc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_chunks_by_hash(
        self, lesson_id: uuid.UUID, content_hash: str
    ) -> list[DocumentChunk]:
        stmt = select(DocumentChunk).where(
            DocumentChunk.lesson_id == lesson_id,
            DocumentChunk.content_hash == content_hash,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_chunks_by_document_hash(
        self, course_id: uuid.UUID, content_hash: str
    ) -> list[DocumentChunk]:
        stmt = select(DocumentChunk).where(
            DocumentChunk.course_id == course_id,
            DocumentChunk.content_hash == content_hash,
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def delete_chunks_for_document(
        self, course_id: uuid.UUID, document_title: str
    ) -> int:
        chunks = await self.get_chunks_for_course(course_id=course_id)
        to_delete = [
            c for c in chunks
            if c.metadata_json.get("document_title") == document_title
        ]
        if to_delete:
            for c in to_delete:
                await self.db.delete(c)
            await self.db.flush()
            return len(to_delete)
        return 0

    async def count_chunks_for_course(self, course_id: uuid.UUID) -> int:
        stmt = select(func.count(DocumentChunk.id)).where(
            DocumentChunk.course_id == course_id
        )
        result = await self.db.execute(stmt)
        return result.scalar() or 0

    # =========================================================================
    # Ingestion Jobs
    # =========================================================================

    async def create_ingestion_job(
        self,
        course_id: uuid.UUID,
        lesson_id: uuid.UUID | None = None,
        organization_id: uuid.UUID | None = None,
        status: str = IngestionStatus.PENDING.value,
    ) -> IngestionJob:
        job = IngestionJob(
            id=uuid.uuid4(),
            course_id=course_id,
            lesson_id=lesson_id,
            organization_id=organization_id,
            status=status,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(job)
        await self.db.flush()
        await self.db.refresh(job)
        return job

    async def get_latest_job_for_course(
        self, course_id: uuid.UUID
    ) -> IngestionJob | None:
        stmt = (
            select(IngestionJob)
            .where(IngestionJob.course_id == course_id)
            .order_by(IngestionJob.created_at.desc())
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def update_job(
        self,
        job: IngestionJob,
        status: str,
        chunks_count: int = 0,
        content_hash: str | None = None,
        error_message: str | None = None,
    ) -> IngestionJob:
        job.status = status
        job.chunks_count = chunks_count
        if content_hash:
            job.content_hash = content_hash
        if error_message:
            job.error_message = error_message
        if status in (IngestionStatus.COMPLETED.value, IngestionStatus.FAILED.value):
            job.completed_at = datetime.now(timezone.utc)
        await self.db.flush()
        await self.db.refresh(job)
        return job

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AIConversationDetailResponse,
    AIConversationResponse,
    CourseIngestionResponse,
    CourseIngestionStatusResponse,
    LessonIngestionResponse,
)
from backend.app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Tutor & Course-Aware RAG"])


@router.post(
    "/chat",
    response_model=AIChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit question to AI Tutor",
    description="Submits a student question to the course-aware AI Tutor, returning grounded answers and citations.",
)
async def chat_with_tutor(
    request: AIChatRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AIChatResponse:
    service = AIService(db)
    return await service.chat(request, current_user)


@router.get(
    "/conversations",
    response_model=list[AIConversationResponse],
    status_code=status.HTTP_200_OK,
    summary="List user AI conversations",
    description="Lists past AI conversation threads for the authenticated student.",
)
async def list_conversations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    course_id: Annotated[uuid.UUID | None, Query(description="Filter by course ID")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    offset: Annotated[int, Query(ge=0, description="Page offset")] = 0,
) -> list[AIConversationResponse]:
    service = AIService(db)
    return await service.list_conversations(
        current_user=current_user,
        course_id=course_id,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=AIConversationDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation details",
    description="Retrieves a specific dialogue thread and its complete message history.",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AIConversationDetailResponse:
    service = AIService(db)
    return await service.get_conversation(conversation_id, current_user)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversation",
    description="Deletes an authorized AI conversation session and associated dialogue history.",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    service = AIService(db)
    await service.delete_conversation(conversation_id, current_user)


@router.post(
    "/ingestion/courses/{course_id}",
    response_model=CourseIngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest course content into RAG index",
    description="Extracts, normalizes, chunks, and embeds all lessons for an authorized course.",
)
async def ingest_course_content(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseIngestionResponse:
    service = AIService(db)
    return await service.ingest_course(course_id, current_user)


@router.get(
    "/ingestion/courses/{course_id}/status",
    response_model=CourseIngestionStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get course ingestion status",
    description="Returns the current ingestion and indexing status for a course.",
)
async def get_course_ingestion_status(
    course_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseIngestionStatusResponse:
    service = AIService(db)
    return await service.get_course_ingestion_status(course_id, current_user)


@router.post(
    "/ingestion/lessons/{lesson_id}",
    response_model=LessonIngestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Reprocess lesson content into RAG index",
    description="Reprocesses and updates embeddings for an individual lesson.",
)
async def reprocess_lesson_content(
    lesson_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> LessonIngestionResponse:
    service = AIService(db)
    return await service.reprocess_lesson(lesson_id, current_user)

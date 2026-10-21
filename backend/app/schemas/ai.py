import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AIChatRequest(BaseModel):
    """Student inquiry submission to the AI Tutor."""

    message: str = Field(..., min_length=1, max_length=4000, description="Question or prompt text")
    course_id: uuid.UUID | None = Field(None, description="Optional active course ID")
    lesson_id: uuid.UUID | None = Field(None, description="Optional active lesson ID")
    conversation_id: uuid.UUID | None = Field(None, description="Optional conversation session ID")
    top_k: int | None = Field(4, ge=1, le=20, description="Configurable maximum retrieved passages")
    relevance_threshold: float | None = Field(0.20, ge=0.0, le=1.0, description="Minimum similarity score")


class SourceCitation(BaseModel):
    """Course content citation supporting an AI answer."""

    chunk_id: str = Field(..., description="Unique chunk ID")
    lesson_id: str = Field(..., description="Source lesson ID")
    lesson_title: str = Field(..., description="Title of the cited lesson")
    module_title: str | None = Field(None, description="Parent module title")
    document_title: str | None = Field(None, description="Title of cited document if applicable")
    page_number: int | None = Field(None, description="Page number for document/PDF citations")
    similarity_score: float = Field(..., description="Cosine similarity score")
    snippet: str = Field(..., description="Excerpt of the retrieved content")


class AIChatResponse(BaseModel):
    """Grounded AI tutor response."""

    conversation_id: uuid.UUID
    message_id: uuid.UUID
    message: str
    is_grounded: bool
    sources: list[SourceCitation]
    follow_up_questions: list[str]
    created_at: datetime


class AIMessageResponse(BaseModel):
    """Serialized conversational message record."""

    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    sources: list[SourceCitation]
    is_grounded: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIConversationResponse(BaseModel):
    """Summary of an AI conversation thread."""

    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID | None
    course_title: str | None = None
    lesson_id: uuid.UUID | None = None
    lesson_title: str | None = None
    title: str
    messages_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AIConversationDetailResponse(BaseModel):
    """Full detail of an AI conversation with message history."""

    id: uuid.UUID
    user_id: uuid.UUID
    course_id: uuid.UUID | None
    course_title: str | None = None
    lesson_id: uuid.UUID | None = None
    title: str
    messages: list[AIMessageResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CourseIngestionResponse(BaseModel):
    """Response returned upon initiating or completing course ingestion."""

    course_id: uuid.UUID
    status: str
    total_lessons: int
    processed_lessons: int
    total_chunks: int
    job_id: uuid.UUID


class CourseIngestionStatusResponse(BaseModel):
    """Status details for course content ingestion."""

    course_id: uuid.UUID
    status: str
    total_lessons: int
    processed_lessons: int
    total_chunks: int
    last_processed_at: datetime | None = None
    error_message: str | None = None


class LessonIngestionResponse(BaseModel):
    """Response returned upon reprocessing an individual lesson."""

    lesson_id: uuid.UUID
    course_id: uuid.UUID
    status: str
    chunks_count: int
    content_hash: str | None = None


class DocumentIngestionRequest(BaseModel):
    """Payload to ingest a raw text or markdown document into course RAG index."""

    title: str = Field(..., min_length=1, max_length=255, description="Document title")
    content: str = Field(..., min_length=1, description="Raw text or markdown content")
    file_type: str = Field("text", description="Document type: text, markdown, or pdf")
    lesson_id: uuid.UUID | None = Field(None, description="Optional associated lesson ID")


class DocumentIngestionResponse(BaseModel):
    """Result of document parsing, chunking, and embedding."""

    course_id: uuid.UUID
    lesson_id: uuid.UUID | None = None
    document_title: str
    file_name: str
    status: str
    total_pages: int
    chunks_count: int
    content_hash: str
    job_id: uuid.UUID


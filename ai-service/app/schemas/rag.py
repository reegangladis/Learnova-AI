from typing import Any

from pydantic import BaseModel, Field


class ChunkTextRequest(BaseModel):
    document_id: str = Field(..., description="Unique document / lesson identifier")
    text: str = Field(..., description="Raw text content to split")
    chunk_size: int = Field(default=800, ge=10, le=4000)
    chunk_overlap: int = Field(default=150, ge=0, le=1000)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ChunkItemResponse(BaseModel):
    chunk_id: str
    document_id: str
    chunk_index: int
    content: str
    metadata: dict[str, Any]


class ChunkTextResponse(BaseModel):
    document_id: str
    total_chunks: int
    chunks: list[ChunkItemResponse]


class EmbedRequest(BaseModel):
    texts: list[str] = Field(..., description="List of text strings to embed")
    model: str | None = None


class EmbedResponse(BaseModel):
    dimension: int
    count: int
    embeddings: list[list[float]]


class DirectRAGQueryRequest(BaseModel):
    question: str
    course_id: str | None = None
    filters: dict[str, Any] | None = None
    chunks: list[ChunkItemResponse] = Field(default_factory=list)


class DirectRAGQueryResponse(BaseModel):
    answer: str
    is_grounded: bool
    sources: list[dict[str, Any]]
    follow_up_questions: list[str]

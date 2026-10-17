import math
from abc import ABC, abstractmethod
from typing import Any

from app.embeddings.base import BaseEmbeddingProvider
from app.rag.chunking import DocumentChunk
from pydantic import BaseModel, Field


class ScoredDocumentChunk(BaseModel):
    """Retrieved document chunk accompanied by relevance similarity score."""

    chunk: DocumentChunk = Field(..., description="Document chunk")
    score: float = Field(..., description="Similarity confidence score [0.0 - 1.0]")


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculates cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0

    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(a * a for a in v1))
    norm2 = math.sqrt(sum(b * b for b in v2))

    if norm1 <= 1e-9 or norm2 <= 1e-9:
        return 0.0

    similarity = dot / (norm1 * norm2)
    # Clamp between 0.0 and 1.0 for normalized metric
    return max(0.0, min(1.0, float(similarity)))


class BaseVectorRetriever(ABC):
    """Abstract interface for vector retrieval systems."""

    @abstractmethod
    async def search_similar(
        self,
        query: str,
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[ScoredDocumentChunk]:
        """Retrieves top-k most semantically relevant chunks for a given query."""


class InMemoryVectorRetriever(BaseVectorRetriever):
    """In-memory vector retriever with metadata filtering and cosine similarity ranking."""

    def __init__(self, embedding_provider: BaseEmbeddingProvider):
        self.embedding_provider = embedding_provider
        # List of tuples: (chunk, embedding_vector)
        self.records: list[tuple[DocumentChunk, list[float]]] = []

    def add_chunks(self, chunks: list[DocumentChunk], embeddings: list[list[float]]) -> None:
        if len(chunks) != len(embeddings):
            raise ValueError("Chunks and embeddings length mismatch.")
        for chunk, emb in zip(chunks, embeddings):
            self.records.append((chunk, emb))

    def clear(self) -> None:
        self.records.clear()

    async def search_similar(
        self,
        query: str,
        top_k: int = 5,
        filters: dict[str, Any] | None = None,
    ) -> list[ScoredDocumentChunk]:
        if not self.records or not query.strip():
            return []

        query_emb = await self.embedding_provider.embed_query(query)
        scored_items: list[ScoredDocumentChunk] = []

        filters = filters or {}
        for chunk, chunk_emb in self.records:
            # Metadata filtering (e.g. course_id, organization_id, lesson_id)
            match = True
            for k, expected in filters.items():
                if expected is not None:
                    actual = chunk.metadata.get(k)
                    if actual != expected and str(actual) != str(expected):
                        match = False
                        break

            if not match:
                continue

            score = cosine_similarity(query_emb, chunk_emb)
            scored_items.append(ScoredDocumentChunk(chunk=chunk, score=round(score, 4)))

        # Sort descending by score
        scored_items.sort(key=lambda x: x.score, reverse=True)
        return scored_items[:top_k]

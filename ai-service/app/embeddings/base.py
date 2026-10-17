from abc import ABC, abstractmethod

from pydantic import BaseModel, Field


class EmbeddingVector(BaseModel):
    """Vector representation of text embedding."""

    vector: list[float] = Field(..., description="High dimensional embedding vector")
    dimension: int = Field(..., description="Vector dimensionality")


class BaseEmbeddingProvider(ABC):
    """Abstract interface for text embedding providers."""

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Generates embedding vector for a single query string."""

    @abstractmethod
    async def embed_documents(self, documents: list[str]) -> list[list[float]]:
        """Generates embedding vectors for a list of document strings."""

from abc import ABC, abstractmethod
from collections.abc import AsyncGenerator
from typing import Any

from pydantic import BaseModel, Field


class LLMMessage(BaseModel):
    """Normalized message representation for LLM interactions."""

    role: str = Field(..., description="Role: system, user, or assistant")
    content: str = Field(..., description="Text content of the message")


class LLMResponse(BaseModel):
    """Normalized response payload from an LLM invocation."""

    content: str = Field(..., description="Generated text content")
    model: str = Field(..., description="Model identifier used for generation")
    usage: dict[str, int] = Field(
        default_factory=dict, description="Token consumption metrics"
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict, description="Provider specific metadata"
    )


class BaseLLMProvider(ABC):
    """Abstract interface defining required contract for LLM providers."""

    @abstractmethod
    async def generate_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        """Asynchronously generates a complete response from the LLM."""

    @abstractmethod
    async def stream_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        """Asynchronously streams generated tokens from the LLM."""

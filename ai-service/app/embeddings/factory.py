from typing import Any, ClassVar

from app.core.config import get_ai_settings
from app.embeddings.base import BaseEmbeddingProvider
from app.embeddings.deterministic_provider import DeterministicEmbeddingProvider
from app.embeddings.openai_provider import OpenAIEmbeddingProvider


class EmbeddingFactory:
    """Registry and factory for dynamically instantiating embedding providers."""

    _registry: ClassVar[dict[str, type[BaseEmbeddingProvider]]] = {
        "deterministic": DeterministicEmbeddingProvider,
        "mock": DeterministicEmbeddingProvider,
        "openai": OpenAIEmbeddingProvider,
    }

    @classmethod
    def register(cls, name: str, provider_cls: type[BaseEmbeddingProvider]) -> None:
        cls._registry[name.lower()] = provider_cls

    @classmethod
    def get_provider(
        cls,
        name: str | None = None,
        **kwargs: Any,
    ) -> BaseEmbeddingProvider:
        settings = get_ai_settings()

        # If not explicitly specified, decide based on environment and available keys
        if not name:
            if settings.OPENAI_API_KEY and settings.APP_ENV != "testing":
                name = "openai"
            else:
                name = "deterministic"

        provider_cls = cls._registry.get(name.lower())
        if not provider_cls:
            raise ValueError(
                f"Embedding provider '{name}' is not registered. Available providers: {list(cls._registry.keys())}"
            )

        if provider_cls is OpenAIEmbeddingProvider and "api_key" not in kwargs:
            kwargs["api_key"] = settings.OPENAI_API_KEY
            kwargs.setdefault("model", settings.EMBEDDING_MODEL)

        return provider_cls(**kwargs)

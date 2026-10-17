from typing import Any, ClassVar

from app.core.config import get_ai_settings
from app.llm.anthropic_provider import AnthropicLLMProvider
from app.llm.base import BaseLLMProvider
from app.llm.mock_provider import MockLLMProvider
from app.llm.openai_provider import OpenAILLMProvider


class LLMFactory:
    """Registry and factory for dynamically instantiating LLM providers."""

    _registry: ClassVar[dict[str, type[BaseLLMProvider]]] = {
        "mock": MockLLMProvider,
        "openai": OpenAILLMProvider,
        "anthropic": AnthropicLLMProvider,
    }

    @classmethod
    def register(cls, name: str, provider_cls: type[BaseLLMProvider]) -> None:
        """Registers a new LLM provider implementation."""
        cls._registry[name.lower()] = provider_cls

    @classmethod
    def get_provider(
        cls,
        name: str | None = None,
        **kwargs: Any,
    ) -> BaseLLMProvider:
        """Instantiates a registered LLM provider."""
        settings = get_ai_settings()

        if not name:
            if settings.OPENAI_API_KEY and settings.APP_ENV != "testing":
                name = "openai"
            elif settings.ANTHROPIC_API_KEY and settings.APP_ENV != "testing":
                name = "anthropic"
            else:
                name = "mock"

        provider_cls = cls._registry.get(name.lower())
        if not provider_cls:
            raise ValueError(
                f"LLM Provider '{name}' is not registered. Available providers: {list(cls._registry.keys())}"
            )

        if provider_cls is OpenAILLMProvider and "api_key" not in kwargs:
            kwargs["api_key"] = settings.OPENAI_API_KEY
        elif provider_cls is AnthropicLLMProvider and "api_key" not in kwargs:
            kwargs["api_key"] = settings.ANTHROPIC_API_KEY

        return provider_cls(**kwargs)

from collections.abc import AsyncGenerator
from typing import Any

import httpx
from app.core.exceptions import AIConfigurationError, AIProviderError, AIRateLimitError
from app.llm.base import BaseLLMProvider, LLMMessage, LLMResponse


class OpenAILLMProvider(BaseLLMProvider):
    """OpenAI Chat Completion provider."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "gpt-4o-mini",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise AIConfigurationError(
                "OpenAI API key is missing. Set OPENAI_API_KEY environment variable."
            )
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.endpoint = "https://api.openai.com/v1/chat/completions"

    async def generate_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.endpoint, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise AIProviderError("OpenAI LLM request timed out.") from exc
            except httpx.RequestError as exc:
                raise AIProviderError(f"Network error contacting OpenAI API: {exc}") from exc

            if response.status_code == 429:
                raise AIRateLimitError("OpenAI LLM rate limit exceeded.")
            if response.status_code in (401, 403):
                raise AIConfigurationError("Invalid or unauthorized OpenAI credentials.")
            if response.status_code >= 400:
                raise AIProviderError(
                    f"OpenAI LLM error {response.status_code}: {response.text}"
                )

            data = response.json()
            choice = data["choices"][0]
            content = choice["message"]["content"]
            usage = data.get("usage", {})
            return LLMResponse(
                content=content,
                model=self.model,
                usage=usage,
                metadata={"finish_reason": choice.get("finish_reason")},
            )

    async def stream_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        # Simple streaming fallback
        res = await self.generate_response(
            messages, temperature=temperature, max_tokens=max_tokens, **kwargs
        )
        yield res.content

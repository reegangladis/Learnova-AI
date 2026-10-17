from collections.abc import AsyncGenerator
from typing import Any

import httpx
from app.core.exceptions import AIConfigurationError, AIProviderError, AIRateLimitError
from app.llm.base import BaseLLMProvider, LLMMessage, LLMResponse


class AnthropicLLMProvider(BaseLLMProvider):
    """Anthropic Claude Messages API provider."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "claude-3-5-sonnet-20241022",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise AIConfigurationError(
                "Anthropic API key is missing. Set ANTHROPIC_API_KEY environment variable."
            )
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.endpoint = "https://api.anthropic.com/v1/messages"

    async def generate_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> LLMResponse:
        system_prompt = ""
        user_messages = []
        for m in messages:
            if m.role == "system":
                system_prompt = m.content
            else:
                user_messages.append({"role": m.role, "content": m.content})

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": user_messages,
            "max_tokens": max_tokens or 1024,
            "temperature": temperature,
        }
        if system_prompt:
            payload["system"] = system_prompt

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.endpoint, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise AIProviderError("Anthropic LLM request timed out.") from exc
            except httpx.RequestError as exc:
                raise AIProviderError(f"Network error contacting Anthropic API: {exc}") from exc

            if response.status_code == 429:
                raise AIRateLimitError("Anthropic LLM rate limit exceeded.")
            if response.status_code in (401, 403):
                raise AIConfigurationError("Invalid or unauthorized Anthropic credentials.")
            if response.status_code >= 400:
                raise AIProviderError(
                    f"Anthropic LLM error {response.status_code}: {response.text}"
                )

            data = response.json()
            content = ""
            for block in data.get("content", []):
                if block.get("type") == "text":
                    content += block.get("text", "")

            usage = data.get("usage", {})
            return LLMResponse(
                content=content,
                model=self.model,
                usage={
                    "prompt_tokens": usage.get("input_tokens", 0),
                    "completion_tokens": usage.get("output_tokens", 0),
                },
                metadata={"stop_reason": data.get("stop_reason")},
            )

    async def stream_response(
        self,
        messages: list[LLMMessage],
        temperature: float = 0.7,
        max_tokens: int | None = None,
        **kwargs: Any,
    ) -> AsyncGenerator[str, None]:
        res = await self.generate_response(
            messages, temperature=temperature, max_tokens=max_tokens, **kwargs
        )
        yield res.content


import httpx
from app.core.exceptions import AIConfigurationError, AIProviderError, AIRateLimitError
from app.embeddings.base import BaseEmbeddingProvider


class OpenAIEmbeddingProvider(BaseEmbeddingProvider):
    """OpenAI embeddings provider using standard OpenAI REST endpoints."""

    def __init__(
        self,
        api_key: str | None = None,
        model: str = "text-embedding-3-small",
        timeout: float = 30.0,
    ):
        if not api_key:
            raise AIConfigurationError(
                "OpenAI API key is missing. Set OPENAI_API_KEY environment variable."
            )
        self.api_key = api_key
        self.model = model
        self.timeout = timeout
        self.endpoint = "https://api.openai.com/v1/embeddings"

    async def _call_api(self, input_data: str | list[str]) -> list[list[float]]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "input": input_data,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(self.endpoint, headers=headers, json=payload)
            except httpx.TimeoutException as exc:
                raise AIProviderError("OpenAI embedding request timed out.") from exc
            except httpx.RequestError as exc:
                raise AIProviderError(f"Network error contacting OpenAI embedding API: {exc}") from exc

            if response.status_code == 429:
                raise AIRateLimitError("OpenAI rate limit exceeded for embeddings.")
            if response.status_code in (401, 403):
                raise AIConfigurationError("Invalid or unauthorized OpenAI credentials.")
            if response.status_code >= 400:
                raise AIProviderError(
                    f"OpenAI embedding error {response.status_code}: {response.text}"
                )

            data = response.json()
            return [item["embedding"] for item in data.get("data", [])]

    async def embed_query(self, text: str) -> list[float]:
        results = await self._call_api(text)
        if not results:
            raise AIProviderError("Empty embedding response returned by OpenAI.")
        return results[0]

    async def embed_documents(self, documents: list[str]) -> list[list[float]]:
        if not documents:
            return []
        return await self._call_api(documents)

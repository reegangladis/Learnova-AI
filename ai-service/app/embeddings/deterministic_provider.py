import hashlib
import math
import re

from app.embeddings.base import BaseEmbeddingProvider


class DeterministicEmbeddingProvider(BaseEmbeddingProvider):
    """Deterministic, local embedding provider for reliable testing and offline development.

    Produces consistent, normalized embedding vectors using character-ngram
    and term-frequency hash mapping. Texts with semantic and lexical overlap
    achieve measurably higher cosine similarity without external network calls.
    """

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def _generate_vector(self, text: str) -> list[float]:
        clean = text.lower().strip()
        if not clean:
            # Return zero vector if text is empty
            return [0.0] * self.dimension

        vector = [0.0] * self.dimension
        words = re.findall(r"\b\w+\b", clean)

        # Word-level features
        for word in words:
            # Deterministic bucket hash
            h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            # Sign hash to avoid non-negative bias
            sign = 1.0 if (h >> 16) % 2 == 0 else -1.0
            vector[idx] += sign * 1.5

        # Character 3-gram features for subword similarity
        for i in range(max(0, len(clean) - 2)):
            ngram = clean[i : i + 3]
            h = int(hashlib.md5(ngram.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h >> 8) % 2 == 0 else -1.0
            vector[idx] += sign * 0.5

        # L2 Normalization to unit length
        norm = math.sqrt(sum(v * v for v in vector))
        if norm > 1e-9:
            vector = [round(v / norm, 6) for v in vector]
        else:
            vector = [0.0] * self.dimension

        return vector

    async def embed_query(self, text: str) -> list[float]:
        return self._generate_vector(text)

    async def embed_documents(self, documents: list[str]) -> list[list[float]]:
        return [self._generate_vector(doc) for doc in documents]

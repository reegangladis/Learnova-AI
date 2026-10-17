import re
import uuid
from abc import ABC, abstractmethod
from typing import Any

from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """Segment of an ingested document."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Parent document identifier")
    content: str = Field(..., description="Chunk text content")
    chunk_index: int = Field(..., description="Zero-based sequence index")
    metadata: dict[str, Any] = Field(default_factory=dict, description="Metadata tags")


class BaseDocumentChunker(ABC):
    """Abstract interface for document splitting and chunking strategies."""

    @abstractmethod
    def chunk_text(
        self,
        document_id: str,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        metadata: dict[str, Any] | None = None,
    ) -> list[DocumentChunk]:
        """Splits raw document text into structured chunks."""


class RecursiveCharacterChunker(BaseDocumentChunker):
    """Hierarchical text splitter that preserves paragraph and sentence boundaries.

    Normalizes whitespace and control characters, applies sliding overlap,
    and assigns deterministic chunk identifiers.
    """

    def __init__(
        self,
        separators: list[str] | None = None,
    ):
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def normalize_text(self, text: str) -> str:
        """Cleans and sanitizes raw document content."""
        if not text:
            return ""
        # Remove null bytes and non-printable control characters except \n and \t
        cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
        # Normalize carriage returns
        cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
        # Collapse excessive blank lines
        cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
        # Strip trailing/leading spaces per line
        lines = [line.strip() for line in cleaned.split("\n")]
        return "\n".join(lines).strip()

    def _split_text(self, text: str, separators: list[str], chunk_size: int) -> list[str]:
        final_chunks: list[str] = []
        separator = separators[-1]
        new_separators: list[str] = []

        for i, s in enumerate(separators):
            if s == "":
                separator = s
                break
            if s in text:
                separator = s
                new_separators = separators[i + 1 :]
                break

        splits = text.split(separator) if separator else list(text)
        good_splits: list[str] = []
        total_len = 0
        for s in splits:
            if len(s) < chunk_size:
                sep_len = len(separator) if good_splits else 0
                if total_len + sep_len + len(s) > chunk_size and good_splits:
                    final_chunks.append(separator.join(good_splits))
                    good_splits = [s]
                    total_len = len(s)
                else:
                    good_splits.append(s)
                    total_len += (len(separator) if len(good_splits) > 1 else 0) + len(s)
            else:
                if good_splits:
                    final_chunks.append(separator.join(good_splits))
                    good_splits = []
                    total_len = 0
                if not new_separators:
                    final_chunks.append(s[:chunk_size])
                else:
                    other_chunks = self._split_text(s, new_separators, chunk_size)
                    final_chunks.extend(other_chunks)

        if good_splits:
            final_chunks.append(separator.join(good_splits))

        return final_chunks

    def chunk_text(
        self,
        document_id: str,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        metadata: dict[str, Any] | None = None,
    ) -> list[DocumentChunk]:
        normalized = self.normalize_text(text)
        if not normalized:
            return []

        meta = metadata or {}
        raw_chunks = self._split_text(normalized, self.separators, chunk_size)

        # Merge with overlap
        chunks: list[DocumentChunk] = []
        current_chunk = ""
        chunk_idx = 0

        for segment in raw_chunks:
            if not current_chunk:
                current_chunk = segment
            elif len(current_chunk) + len(segment) + 1 <= chunk_size:
                current_chunk += " " + segment
            else:
                if current_chunk.strip():
                    chunk_id = str(
                        uuid.uuid5(
                            uuid.NAMESPACE_DNS,
                            f"{document_id}:{chunk_idx}:{current_chunk[:30]}",
                        )
                    )
                    chunks.append(
                        DocumentChunk(
                            chunk_id=chunk_id,
                            document_id=document_id,
                            content=current_chunk.strip(),
                            chunk_index=chunk_idx,
                            metadata=meta.copy(),
                        )
                    )
                    chunk_idx += 1

                # Retain overlap from end of current chunk
                if chunk_overlap > 0 and len(current_chunk) > chunk_overlap:
                    current_chunk = current_chunk[-chunk_overlap:] + " " + segment
                else:
                    current_chunk = segment

        if current_chunk.strip():
            chunk_id = str(
                uuid.uuid5(
                    uuid.NAMESPACE_DNS,
                    f"{document_id}:{chunk_idx}:{current_chunk[:30]}",
                )
            )
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=document_id,
                    content=current_chunk.strip(),
                    chunk_index=chunk_idx,
                    metadata=meta.copy(),
                )
            )

        return chunks

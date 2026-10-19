"""Storage abstraction for digital learning assets.

In Phase 3, this service validates resource references and URLs without
storing binary blobs in PostgreSQL. It defines extension hooks for Phase 7
S3-compatible object storage integration.
"""

from abc import ABC, abstractmethod
from typing import Any, ClassVar
from urllib.parse import urlparse

from backend.app.core.errors import AppExceptions
from backend.app.models.course import LessonContentType


class BaseStorageProvider(ABC):
    """Abstract storage provider interface."""

    @abstractmethod
    def validate_reference(
        self, resource_url: str, content_type: LessonContentType | str
    ) -> bool:
        """Validate whether a resource URI is syntactically and structurally sound."""

    @abstractmethod
    async def get_presigned_upload_url(
        self, file_name: str, content_type: str, expires_in: int = 3600
    ) -> dict[str, Any]:
        """Generate a presigned upload URL for direct client-to-storage upload."""


class ReferenceStorageService(BaseStorageProvider):
    """Default Phase 3 implementation validating resource references.

    Guarantees no binary payloads are stored in the relational database.
    """

    ALLOWED_SCHEMES: ClassVar[set[str]] = {"http", "https", "s3", "storage", "ipfs"}
    ALLOWED_ATTACHMENT_TYPES: ClassVar[set[str]] = {
        "pdf", "zip", "csv", "json", "py", "txt", "ipynb", "docx", "pptx", "png", "jpg", "md"
    }
    MAX_ATTACHMENT_BYTES: ClassVar[int] = 104_857_600  # 100 MB

    def validate_reference(
        self, resource_url: str, content_type: LessonContentType | str
    ) -> bool:
        if not resource_url or not isinstance(resource_url, str):
            return False

        stripped = resource_url.strip()
        if not stripped:
            return False

        try:
            parsed = urlparse(stripped)
        except Exception:
            return False

        scheme = parsed.scheme.lower()
        if scheme not in self.ALLOWED_SCHEMES:
            return False

        if not (parsed.netloc or parsed.path):
            return False

        c_type = (
            content_type.value
            if isinstance(content_type, LessonContentType)
            else str(content_type).lower()
        )

        if c_type == LessonContentType.VIDEO.value:
            # Video references: must have valid netloc if http/https, or valid path for storage
            if scheme in {"http", "https"} and not parsed.netloc:
                return False

        elif c_type == LessonContentType.PDF.value:
            # PDF references: if extension is provided in path, verify it's pdf
            path_lower = parsed.path.lower()
            if "." in path_lower and not path_lower.endswith(".pdf") and "?" not in stripped:
                # If there's an explicit non-pdf extension in path without query parameters, reject
                ext = path_lower.rsplit(".", 1)[-1]
                if ext in {"exe", "bat", "sh", "bin", "mp4", "zip"}:
                    return False

        elif c_type == LessonContentType.EXTERNAL_RESOURCE.value:
            if scheme in {"http", "https"} and not parsed.netloc:
                return False

        return True

    def validate_downloadable_resource(
        self, resource: dict[str, Any]
    ) -> tuple[bool, str | None]:
        """Validates a downloadable attachment dictionary structure and size."""
        if not isinstance(resource, dict):
            return False, "Downloadable resource must be an object."

        title = resource.get("title") or resource.get("name")
        if not title or not isinstance(title, str) or not title.strip():
            return False, "Resource title is required."

        url = resource.get("url")
        if not url or not isinstance(url, str):
            return False, "Resource URL is required."

        if not self.validate_reference(url, LessonContentType.EXTERNAL_RESOURCE):
            return False, "Resource URL reference is invalid or uses an unsupported protocol."

        file_type = str(resource.get("file_type", "")).lower().lstrip(".")
        if file_type and file_type not in self.ALLOWED_ATTACHMENT_TYPES:
            return False, f"File type '{file_type}' is not supported for downloads."

        size_bytes = resource.get("size_bytes")
        if size_bytes is not None:
            if not isinstance(size_bytes, int) or size_bytes < 0:
                return False, "Resource size_bytes must be a non-negative integer."
            if size_bytes > self.MAX_ATTACHMENT_BYTES:
                return False, f"Resource exceeds maximum allowed size of {self.MAX_ATTACHMENT_BYTES // (1024 * 1024)}MB."

        return True, None

    async def get_presigned_upload_url(
        self, file_name: str, content_type: str, expires_in: int = 3600
    ) -> dict[str, Any]:
        """Placeholder hook for future S3/GCS bucket integration.

        In Phase 3, direct binary uploads to the API server are rejected to prevent
        bloating the database or local filesystem before object storage is configured.
        """
        raise AppExceptions.ValidationException(
            message=(
                "Direct binary upload is not enabled. Please supply a valid "
                "resource URL reference (HTTPS / S3 / cloud CDN) for multimedia assets."
            )
        )


storage_service = ReferenceStorageService()

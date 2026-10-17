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

    def validate_reference(
        self, resource_url: str, content_type: LessonContentType | str
    ) -> bool:
        if not resource_url or not isinstance(resource_url, str):
            return False

        stripped = resource_url.strip()
        if not stripped:
            return False

        parsed = urlparse(stripped)
        if parsed.scheme.lower() not in self.ALLOWED_SCHEMES:
            return False

        return bool(parsed.netloc or parsed.path)


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

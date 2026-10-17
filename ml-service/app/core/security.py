from app.core.config import get_ml_settings
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

internal_key_header = APIKeyHeader(name="X-Internal-Service-Key", auto_error=False)


def verify_internal_service_key(
    api_key: str | None = Security(internal_key_header),
) -> bool:
    """Verifies internal service-to-service authorization token."""
    settings = get_ml_settings()
    if settings.INTERNAL_SERVICE_KEY and (
        not api_key or api_key != settings.INTERNAL_SERVICE_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service authorization key.",
        )
    return True

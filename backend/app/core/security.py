import hashlib
import re
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

from backend.app.core.config import get_settings
from backend.app.core.errors import AppExceptions

settings = get_settings()


def hash_password(password: str) -> str:
    """Securely hashes a plaintext password using bcrypt with a generated salt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:  # noqa: BLE001
        return False


def validate_password_strength(password: str) -> tuple[bool, str | None]:
    """Validates password strength requirements:

    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one numeric digit
    - At least one special character
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"\d", password):
        return False, "Password must contain at least one numeric digit."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_+=\[\]]", password):
        return False, "Password must contain at least one special character."
    return True, None


def generate_secure_random_token(nbytes: int = 32) -> str:
    """Generates a cryptographically secure URL-safe random string."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """Computes a SHA-256 hash digest of a raw token string for secure DB storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: str | uuid.UUID,
    email: str,
    roles: list[str],
    permissions: list[str],
    session_id: str | uuid.UUID,
    expires_delta: timedelta | None = None,
) -> str:
    """Creates a signed short-lived JWT access token."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "roles": roles,
        "permissions": permissions,
        "sid": str(session_id),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "iss": settings.APP_NAME,
    }

    return jwt.encode(
        payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodes and validates a JWT access token, handling expiration and signature errors."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.APP_NAME,
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AppExceptions.UnauthorizedException(message="Access token has expired.")
    except jwt.InvalidTokenError:
        raise AppExceptions.UnauthorizedException(
            message="Invalid authentication token."
        )

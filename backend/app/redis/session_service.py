import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from redis.asyncio.client import Redis

from backend.app.core.config import get_settings
from backend.app.redis.client import get_redis_client

logger = logging.getLogger("learnova")
settings = get_settings()

SESSION_PREFIX = "learnova:session:"
USER_SESSIONS_PREFIX = "learnova:user_sessions:"
REVOKED_SESSION_PREFIX = "learnova:revoked_session:"


def _ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


class RedisSessionService:
    """Redis-backed session management service for distributed session caching,

    fast authentication validation, automatic TTL expiration, and instant multi-device revocation.
    """

    def __init__(self, client: Redis | None = None):
        self._client = client

    @property
    def client(self) -> Redis:
        if self._client is not None:
            return self._client
        return get_redis_client()

    def _session_key(self, session_id: str | uuid.UUID) -> str:
        return f"{SESSION_PREFIX}{session_id}"

    def _user_sessions_key(self, user_id: str | uuid.UUID) -> str:
        return f"{USER_SESSIONS_PREFIX}{user_id}"

    def _revoked_key(self, session_id: str | uuid.UUID) -> str:
        return f"{REVOKED_SESSION_PREFIX}{session_id}"

    async def store_session(
        self,
        session_id: str | uuid.UUID,
        user_id: str | uuid.UUID,
        email: str,
        roles: list[str],
        permissions: list[str],
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> bool:
        """Stores an active session record in Redis with a TTL matching session expiration."""
        try:
            sid_str = str(session_id)
            uid_str = str(user_id)
            now = datetime.now(timezone.utc)
            utc_expires = _ensure_utc(expires_at) or (now + datetime.timedelta(days=7))

            ttl_seconds = max(1, int((utc_expires - now).total_seconds()))

            data = {
                "session_id": sid_str,
                "user_id": uid_str,
                "email": email,
                "roles": roles,
                "permissions": permissions,
                "is_active": True,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "created_at": now.isoformat(),
                "expires_at": utc_expires.isoformat(),
            }

            cli = self.client
            # Store session payload with TTL
            await cli.set(self._session_key(sid_str), json.dumps(data), ex=ttl_seconds)

            # Track session in user sessions set
            user_key = self._user_sessions_key(uid_str)
            await cli.sadd(user_key, sid_str)
            await cli.expire(user_key, ttl_seconds)

            # Ensure any lingering revocation marker for this ID is removed
            await cli.delete(self._revoked_key(sid_str))
            return True
        except Exception as e:
            logger.warning(
                f"Redis store_session failed (session={session_id}): {e}. Fallback to DB active."
            )
            return False

    async def get_session(
        self, session_id: str | uuid.UUID
    ) -> dict[str, Any] | None:
        """Retrieves session metadata from Redis if active and not marked revoked."""
        try:
            sid_str = str(session_id)
            cli = self.client

            # If explicitly marked as revoked, immediately return None
            if await cli.exists(self._revoked_key(sid_str)):
                return None

            raw = await cli.get(self._session_key(sid_str))
            if not raw:
                return None

            data = json.loads(raw)
            if not data.get("is_active", True):
                return None
            return data
        except Exception as e:
            logger.warning(
                f"Redis get_session failed (session={session_id}): {e}. Fallback to DB active."
            )
            return None

    async def is_session_revoked(self, session_id: str | uuid.UUID) -> bool:
        """Checks whether a session has been explicitly revoked or invalidated in Redis."""
        try:
            sid_str = str(session_id)
            cli = self.client

            if await cli.exists(self._revoked_key(sid_str)):
                return True

            raw = await cli.get(self._session_key(sid_str))
            if raw:
                data = json.loads(raw)
                return not bool(data.get("is_active", True))
            return False
        except Exception as e:
            logger.warning(f"Redis is_session_revoked check failed: {e}")
            return False

    async def revoke_session(
        self,
        session_id: str | uuid.UUID,
        user_id: str | uuid.UUID | None = None,
        revocation_ttl_seconds: int = 1800,
    ) -> bool:
        """Immediately invalidates a session in Redis and records a revocation tombstone."""
        try:
            sid_str = str(session_id)
            cli = self.client

            # Set revocation marker to block any in-flight access tokens
            await cli.set(
                self._revoked_key(sid_str), "revoked", ex=revocation_ttl_seconds
            )

            # Delete the active session key
            await cli.delete(self._session_key(sid_str))

            # Remove from user's active session set
            if user_id:
                await cli.srem(self._user_sessions_key(str(user_id)), sid_str)
            return True
        except Exception as e:
            logger.warning(f"Redis revoke_session failed (session={session_id}): {e}")
            return False

    async def revoke_all_user_sessions(
        self, user_id: str | uuid.UUID, revocation_ttl_seconds: int = 1800
    ) -> bool:
        """Invalidates all cached sessions for a given user across all devices."""
        try:
            uid_str = str(user_id)
            cli = self.client
            user_key = self._user_sessions_key(uid_str)
            session_ids = await cli.smembers(user_key)

            if session_ids:
                for sid in session_ids:
                    sid_str = sid if isinstance(sid, str) else sid.decode("utf-8")
                    await cli.set(
                        self._revoked_key(sid_str),
                        "revoked",
                        ex=revocation_ttl_seconds,
                    )
                    await cli.delete(self._session_key(sid_str))

            await cli.delete(user_key)
            return True
        except Exception as e:
            logger.warning(
                f"Redis revoke_all_user_sessions failed (user={user_id}): {e}"
            )
            return False

    async def extend_session(
        self, session_id: str | uuid.UUID, new_expires_at: datetime
    ) -> bool:
        """Extends TTL of an existing session record upon refresh token rotation."""
        try:
            sid_str = str(session_id)
            now = datetime.now(timezone.utc)
            utc_expires = _ensure_utc(new_expires_at) or now
            ttl_seconds = max(1, int((utc_expires - now).total_seconds()))

            cli = self.client
            raw = await cli.get(self._session_key(sid_str))
            if raw:
                data = json.loads(raw)
                data["expires_at"] = utc_expires.isoformat()
                await cli.set(
                    self._session_key(sid_str), json.dumps(data), ex=ttl_seconds
                )
            return True
        except Exception as e:
            logger.warning(f"Redis extend_session failed: {e}")
            return False


_redis_session_service: RedisSessionService | None = None


def get_redis_session_service() -> RedisSessionService:
    """Returns singleton RedisSessionService instance."""
    global _redis_session_service
    if _redis_session_service is None:
        _redis_session_service = RedisSessionService()
    return _redis_session_service

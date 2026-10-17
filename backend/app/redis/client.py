import logging
import time
from typing import Any

import redis.asyncio as aioredis
from redis.asyncio.client import Redis

from backend.app.core.config import get_settings

logger = logging.getLogger("learnova")

_redis_client: Redis | None = None


def get_redis_client() -> Redis:
    """Returns or initializes the singleton async Redis client pool."""
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_POOL_MAX_CONNECTIONS,
            encoding="utf-8",
            decode_responses=True,
            socket_timeout=5.0,
            socket_connect_timeout=5.0,
        )
    return _redis_client


async def close_redis() -> None:
    """Closes Redis client connections cleanly during application shutdown."""
    global _redis_client
    if _redis_client is not None:
        logger.info("Closing Redis connection pool...")
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis connection pool closed.")


async def check_redis_connection() -> dict[str, Any]:
    """Performs a real PING check against Redis and measures latency."""
    client = get_redis_client()
    start_time = time.perf_counter()

    try:
        pong = await client.ping()
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        info = await client.info("server")
        redis_version = info.get("redis_version", "Unknown")

        return {
            "status": "healthy" if pong else "unhealthy",
            "connected": bool(pong),
            "latency_ms": duration_ms,
            "version": redis_version,
            "error": None,
        }
    except Exception as e:  # noqa: BLE001
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        logger.error(f"Redis health check failed: {e}")
        return {
            "status": "unhealthy",
            "connected": False,
            "latency_ms": duration_ms,
            "version": None,
            "error": str(e),
        }


class CacheService:
    """Clean abstraction wrapper for Redis caching operations."""

    def __init__(self, client: Redis | None = None):
        self.client = client or get_redis_client()

    async def get(self, key: str) -> str | None:
        """Retrieves a string value by key."""
        return await self.client.get(key)

    async def set(self, key: str, value: str, ttl_seconds: int | None = None) -> bool:
        """Sets a string value with optional TTL expiration."""
        return await self.client.set(key, value, ex=ttl_seconds)

    async def delete(self, key: str) -> int:
        """Deletes a key from cache."""
        return await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        """Checks if a key exists."""
        return bool(await self.client.exists(key))

    async def expire(self, key: str, ttl_seconds: int) -> bool:
        """Sets expiration on an existing key."""
        return bool(await self.client.expire(key, ttl_seconds))

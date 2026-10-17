import logging

from fastapi import Request

from backend.app.core.config import get_settings
from backend.app.core.errors import AppExceptions
from backend.app.redis.client import get_redis_client

logger = logging.getLogger("learnova.ratelimit")
settings = get_settings()


class RateLimiter:
    """Redis-backed sliding window rate limiter."""

    @staticmethod
    def get_client_ip(request: Request) -> str:
        """Extracts the client IP address from request headers or connection."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()
        if request.client:
            return request.client.host
        return "127.0.0.1"

    @classmethod
    async def check_rate_limit(
        cls,
        key_prefix: str,
        identifier: str,
        max_requests: int,
        window_seconds: int,
    ) -> bool:
        """Evaluates whether the identifier has exceeded the request threshold.

        Uses atomic Redis INCR and EXPIRE.
        """
        if not settings.RATE_LIMIT_ENABLED:
            return True

        redis_key = f"ratelimit:{key_prefix}:{identifier}"
        try:
            client = get_redis_client()
            current_count = await client.incr(redis_key)
            if current_count == 1:
                await client.expire(redis_key, window_seconds)

            if current_count > max_requests:
                ttl = await client.ttl(redis_key)
                logger.warning(
                    f"Rate limit exceeded for {key_prefix}:{identifier} (count={current_count}/{max_requests}, ttl={ttl}s)"
                )
                raise AppExceptions.RateLimitException(
                    message="Too many requests. Please try again later.",
                    details={"retry_after_seconds": max(ttl, 1)},
                )
            return True
        except AppExceptions.RateLimitException:
            raise
        except Exception as e:  # noqa: BLE001
            # Fallback: if Redis connection is unavailable in dev, log warning and allow request
            logger.warning(
                f"Rate limiter Redis check failed ({e}), failing open for request."
            )
            return True


def rate_limit(
    key_prefix: str,
    max_requests: int | None = None,
    window_seconds: int | None = None,
):
    """FastAPI dependency factory for endpoint rate limiting."""
    limit = max_requests or settings.RATE_LIMIT_AUTH_DEFAULT_MAX
    window = window_seconds or settings.RATE_LIMIT_AUTH_DEFAULT_WINDOW

    async def dependency(request: Request):
        client_ip = RateLimiter.get_client_ip(request)
        await RateLimiter.check_rate_limit(
            key_prefix=key_prefix,
            identifier=client_ip,
            max_requests=limit,
            window_seconds=window,
        )

    return dependency

from unittest.mock import AsyncMock

import pytest

from backend.app.redis.client import CacheService


@pytest.mark.asyncio
async def test_cache_service_operations():
    """Verify CacheService wrapper operations with mock Redis client."""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = "cached_value"
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = 1
    mock_redis.exists.return_value = 1
    mock_redis.expire.return_value = True

    cache = CacheService(client=mock_redis)

    # Test GET
    val = await cache.get("test_key")
    assert val == "cached_value"
    mock_redis.get.assert_awaited_once_with("test_key")

    # Test SET
    success = await cache.set("test_key", "new_val", ttl_seconds=60)
    assert success is True
    mock_redis.set.assert_awaited_once_with("test_key", "new_val", ex=60)

    # Test DELETE
    del_count = await cache.delete("test_key")
    assert del_count == 1
    mock_redis.delete.assert_awaited_once_with("test_key")

    # Test EXISTS
    exists = await cache.exists("test_key")
    assert exists is True

    # Test EXPIRE
    exp = await cache.expire("test_key", 120)
    assert exp is True

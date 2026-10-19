import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Set
from unittest.mock import AsyncMock

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.redis.client import CacheService
from backend.app.redis.session_service import RedisSessionService, get_redis_session_service


class InMemoryRedisClient:
    """Deterministic in-memory Redis client for unit & integration testing."""

    def __init__(self):
        self.data: dict[str, str] = {}
        self.sets: dict[str, Set[str]] = {}
        self.ttls: dict[str, int] = {}

    async def get(self, key: str) -> str | None:
        return self.data.get(key)

    async def set(self, key: str, value: str, ex: int | None = None) -> bool:
        self.data[key] = str(value)
        if ex is not None:
            self.ttls[key] = ex
        return True

    async def delete(self, key: str) -> int:
        count = 0
        if key in self.data:
            del self.data[key]
            count += 1
        if key in self.sets:
            del self.sets[key]
            count += 1
        return count

    async def exists(self, key: str) -> int:
        return 1 if (key in self.data or key in self.sets) else 0

    async def expire(self, key: str, ttl: int) -> bool:
        self.ttls[key] = ttl
        return True

    async def sadd(self, key: str, *members: str) -> int:
        if key not in self.sets:
            self.sets[key] = set()
        for m in members:
            self.sets[key].add(str(m))
        return len(members)

    async def smembers(self, key: str) -> Set[str]:
        return self.sets.get(key, set()).copy()

    async def srem(self, key: str, *members: str) -> int:
        if key not in self.sets:
            return 0
        count = 0
        for m in members:
            str_m = str(m)
            if str_m in self.sets[key]:
                self.sets[key].remove(str_m)
                count += 1
        return count

    async def ping(self) -> bool:
        return True

    async def info(self, section: str | None = None) -> dict[str, str]:
        return {"redis_version": "7.2.4-mock"}


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


@pytest.mark.asyncio
async def test_redis_session_service_lifecycle():
    """Verify RedisSessionService creation, retrieval, extension, and revocation."""
    fake_client = InMemoryRedisClient()
    service = RedisSessionService(client=fake_client)

    session_id = uuid.uuid4()
    user_id = uuid.uuid4()
    email = "redis.learner@learnova.ai"
    roles = ["STUDENT"]
    permissions = ["COURSE_READ"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    # 1. Store session
    stored = await service.store_session(
        session_id=session_id,
        user_id=user_id,
        email=email,
        roles=roles,
        permissions=permissions,
        expires_at=expires_at,
        ip_address="127.0.0.1",
        user_agent="PyTestClient",
    )
    assert stored is True

    # 2. Retrieve session
    data = await service.get_session(session_id)
    assert data is not None
    assert data["session_id"] == str(session_id)
    assert data["user_id"] == str(user_id)
    assert data["email"] == email
    assert data["is_active"] is True
    assert await service.is_session_revoked(session_id) is False

    # 3. Extend session
    new_expires_at = datetime.now(timezone.utc) + timedelta(days=14)
    extended = await service.extend_session(session_id, new_expires_at)
    assert extended is True
    updated_data = await service.get_session(session_id)
    assert updated_data is not None
    assert updated_data["expires_at"] == new_expires_at.isoformat()

    # 4. Revoke single session
    revoked = await service.revoke_session(session_id, user_id=user_id)
    assert revoked is True
    assert await service.is_session_revoked(session_id) is True
    assert await service.get_session(session_id) is None

    # 5. Revoke all user sessions
    sess_id_2 = uuid.uuid4()
    sess_id_3 = uuid.uuid4()
    await service.store_session(
        session_id=sess_id_2,
        user_id=user_id,
        email=email,
        roles=roles,
        permissions=permissions,
        expires_at=expires_at,
    )
    await service.store_session(
        session_id=sess_id_3,
        user_id=user_id,
        email=email,
        roles=roles,
        permissions=permissions,
        expires_at=expires_at,
    )

    assert await service.get_session(sess_id_2) is not None
    assert await service.get_session(sess_id_3) is not None

    all_revoked = await service.revoke_all_user_sessions(user_id)
    assert all_revoked is True
    assert await service.get_session(sess_id_2) is None
    assert await service.get_session(sess_id_3) is None
    assert await service.is_session_revoked(sess_id_2) is True
    assert await service.is_session_revoked(sess_id_3) is True


@pytest.mark.asyncio
async def test_redis_session_revocation_blocks_authenticated_requests(
    client: AsyncClient,
):
    """Verify that an access token is immediately rejected if its session is revoked in Redis."""
    # Attach in-memory redis client to the global session service singleton
    fake_client = InMemoryRedisClient()
    redis_service = get_redis_session_service()
    redis_service._client = fake_client

    # 1. Register and login
    reg_payload = {
        "email": "session.redis.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Redis",
        "last_name": "SessionTest",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "session.redis.test@learnova.ai", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    access_token = login_res.cookies.get("learnova_access_token")
    assert access_token is not None

    # 2. Access protected endpoint -> 200 OK
    me_res1 = await client.get("/api/v1/auth/me", cookies={"learnova_access_token": access_token})
    assert me_res1.status_code == 200
    assert me_res1.json()["email"] == "session.redis.test@learnova.ai"

    # 3. Perform logout (which revokes session in DB and Redis)
    logout_res = await client.post(
        "/api/v1/auth/logout",
        cookies={
            "learnova_access_token": access_token,
            "learnova_refresh_token": login_res.cookies.get("learnova_refresh_token", ""),
        },
    )
    assert logout_res.status_code == 200

    # 4. Attempt to reuse the SAME access token (simulating stolen/in-flight token)
    # Must immediately return 401 Unauthorized because session was revoked in Redis!
    me_res2 = await client.get("/api/v1/auth/me", cookies={"learnova_access_token": access_token})
    assert me_res2.status_code == 401
    assert "credentials were not provided or are invalid" in me_res2.json()["error"]["message"]

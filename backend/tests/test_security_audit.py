import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.audit import AuditLog


@pytest.mark.asyncio
async def test_security_headers_present_in_responses(client: AsyncClient):
    """Verify standard security headers are attached to all API responses."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"
    assert response.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
    assert response.headers.get("x-xss-protection") == "1; mode=block"


@pytest.mark.asyncio
async def test_audit_logs_recorded_on_auth_events(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify audit logs are persisted in database upon registration and login."""
    reg_payload = {
        "email": "audit.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Audit",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    await client.post(
        "/api/v1/auth/login",
        json={"email": "audit.test@learnova.ai", "password": "SecurePassword123!"},
    )

    # Query audit logs in DB
    result = await db_session.execute(
        select(AuditLog).order_by(AuditLog.created_at.asc())
    )
    logs = list(result.scalars().all())
    event_types = [log.event_type for log in logs]

    assert "USER_REGISTERED" in event_types
    assert "LOGIN_SUCCESS" in event_types


@pytest.mark.asyncio
async def test_password_hashes_never_returned_in_any_response(client: AsyncClient):
    """Ensure password hashes or private secret fields are never returned in responses."""
    reg_payload = {
        "email": "nopwdleak@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Secret",
        "last_name": "Check",
    }
    res = await client.post("/api/v1/auth/register", json=reg_payload)
    data = res.json()
    assert "password_hash" not in str(data)
    assert "password" not in data.get("user", {})
    assert "hash" not in str(data.get("user", {}))

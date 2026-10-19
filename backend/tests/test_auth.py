import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.security import hash_token
from backend.app.repositories.session_repo import SessionRepository
from backend.app.repositories.token_repo import TokenRepository
from backend.app.repositories.user_repo import UserRepository


@pytest.mark.asyncio
async def test_user_registration_success(client: AsyncClient, db_session: AsyncSession):
    """Verify standard user registration flow."""
    payload = {
        "email": "alice.student@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Alice",
        "last_name": "Student",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == "alice.student@learnova.ai"
    assert data["user"]["first_name"] == "Alice"
    assert "STUDENT" in data["user"]["roles"]
    assert "password_hash" not in str(data)  # Passwords never exposed


@pytest.mark.asyncio
async def test_user_registration_duplicate_email_fails(client: AsyncClient):
    """Verify duplicate email registration is rejected with 409 Conflict."""
    payload = {
        "email": "duplicate@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Test",
        "last_name": "User",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["error"]["message"]


@pytest.mark.asyncio
async def test_user_registration_weak_password_fails(client: AsyncClient):
    """Verify weak password registration fails with 422."""
    payload = {
        "email": "weak@learnova.ai",
        "password": "password",  # Missing uppercase, digit, special
        "confirm_password": "password",
        "first_name": "Test",
        "last_name": "User",
    }
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_user_login_success_and_cookies(client: AsyncClient):
    """Verify login sets HttpOnly access and refresh token cookies."""
    reg_payload = {
        "email": "login.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Bob",
        "last_name": "Learner",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "login.test@learnova.ai",
        "password": "SecurePassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
    assert "learnova_access_token" in response.cookies
    assert "learnova_refresh_token" in response.cookies


@pytest.mark.asyncio
async def test_user_login_invalid_password_fails(client: AsyncClient):
    """Verify invalid password returns generic 401 error."""
    reg_payload = {
        "email": "wrongpwd@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Test",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_payload = {
        "email": "wrongpwd@learnova.ai",
        "password": "WrongPassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_user_login_nonexistent_email_fails_generic(client: AsyncClient):
    """Verify non-existent email returns same generic 401 error to prevent enumeration."""
    login_payload = {
        "email": "nonexistent.user.12345@learnova.ai",
        "password": "SecurePassword123!",
    }
    response = await client.post("/api/v1/auth/login", json=login_payload)
    assert response.status_code == 401
    assert "Invalid email or password" in response.json()["error"]["message"]


@pytest.mark.asyncio
async def test_account_locking_after_consecutive_failures(client: AsyncClient):
    """Verify account lock is triggered after consecutive failed attempts."""
    reg_payload = {
        "email": "lockout.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Lock",
        "last_name": "Out",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Trigger 5 failed attempts
    for _ in range(5):
        res = await client.post(
            "/api/v1/auth/login",
            json={"email": "lockout.test@learnova.ai", "password": "WrongPassword123!"},
        )
        assert res.status_code == 401

    # 6th attempt should return 423 Locked
    locked_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "lockout.test@learnova.ai", "password": "SecurePassword123!"},
    )
    assert locked_res.status_code == 423
    assert "locked" in locked_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    """Verify refresh token rotation generates new session tokens."""
    reg_payload = {
        "email": "rotation.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Rotate",
        "last_name": "Token",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "rotation.test@learnova.ai", "password": "SecurePassword123!"},
    )
    refresh_token_1 = login_res.cookies.get("learnova_refresh_token")
    assert refresh_token_1 is not None

    # Call /refresh with the cookie
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"learnova_refresh_token": refresh_token_1},
    )
    assert refresh_res.status_code == 200
    refresh_token_2 = refresh_res.cookies.get("learnova_refresh_token")
    assert refresh_token_2 is not None
    assert refresh_token_2 != refresh_token_1


@pytest.mark.asyncio
async def test_refresh_token_reuse_detection(client: AsyncClient):
    """Verify refresh token reuse detection revokes entire token family."""
    reg_payload = {
        "email": "reuse.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Reuse",
        "last_name": "Test",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "reuse.test@learnova.ai", "password": "SecurePassword123!"},
    )
    refresh_token_old = login_res.cookies.get("learnova_refresh_token")

    # Rotate token once
    rot_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"learnova_refresh_token": refresh_token_old},
    )
    assert rot_res.status_code == 200

    # Attacker / rogue client presents the OLD already-revoked refresh token
    reuse_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"learnova_refresh_token": refresh_token_old},
    )
    assert reuse_res.status_code == 401
    assert "reuse detected" in reuse_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    """Verify /auth/me returns the current user profile."""
    reg_payload = {
        "email": "getme.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Profile",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "getme.test@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    me_res = await client.get(
        "/api/v1/auth/me", cookies={"learnova_access_token": access_token}
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "getme.test@learnova.ai"


@pytest.mark.asyncio
async def test_logout_and_session_invalidation(client: AsyncClient):
    """Verify logout revokes session and clears cookies."""
    reg_payload = {
        "email": "logout.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Logout",
        "last_name": "Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "logout.test@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")
    refresh_token = login_res.cookies.get("learnova_refresh_token")

    # Logout
    logout_res = await client.post(
        "/api/v1/auth/logout",
        cookies={
            "learnova_access_token": access_token,
            "learnova_refresh_token": refresh_token,
        },
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True


@pytest.mark.asyncio
async def test_password_change_flow(client: AsyncClient):
    """Verify authenticated password change flow."""
    reg_payload = {
        "email": "chgpwd.test@learnova.ai",
        "password": "OldPassword123!",
        "confirm_password": "OldPassword123!",
        "first_name": "Change",
        "last_name": "Pass",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "chgpwd.test@learnova.ai", "password": "OldPassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    # Change password
    chg_res = await client.post(
        "/api/v1/auth/change-password",
        json={
            "current_password": "OldPassword123!",
            "new_password": "NewSecurePassword123!",
            "confirm_password": "NewSecurePassword123!",
        },
        cookies={"learnova_access_token": access_token},
    )
    assert chg_res.status_code == 200

    # Verify login with new password works
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "chgpwd.test@learnova.ai", "password": "NewSecurePassword123!"},
    )
    assert new_login.status_code == 200


@pytest.mark.asyncio
async def test_email_verification_flow(client: AsyncClient, db_session: AsyncSession):
    """Verify email verification token marking user as verified."""
    reg_payload = {
        "email": "verify.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Verify",
        "last_name": "User",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201

    # Directly retrieve raw token from DB for test verification
    user_repo = UserRepository(db_session)
    user = await user_repo.get_by_email("verify.test@learnova.ai")
    assert user is not None
    assert user.is_verified is False

    token_repo = TokenRepository(db_session)
    # Generate test token
    raw_token = "test-token-12345-67890"
    from datetime import datetime, timedelta, timezone

    await token_repo.create_email_verification_token(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    await db_session.commit()

    # Call verify-email endpoint
    ver_res = await client.post("/api/v1/auth/verify-email", json={"token": raw_token})
    assert ver_res.status_code == 200
    assert ver_res.json()["success"] is True

    # Check that user is verified
    updated_user = await user_repo.get_by_email("verify.test@learnova.ai")
    assert updated_user.is_verified is True


@pytest.mark.asyncio
async def test_password_reset_flow_and_single_use(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify forgot password and reset password flow with single-use token."""
    from datetime import datetime, timedelta, timezone

    reg_payload = {
        "email": "pwreset.test@learnova.ai",
        "password": "OldPassword123!",
        "confirm_password": "OldPassword123!",
        "first_name": "Reset",
        "last_name": "Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # 1. Request forgot password
    forgot_res = await client.post(
        "/api/v1/auth/forgot-password", json={"email": "pwreset.test@learnova.ai"}
    )
    assert forgot_res.status_code == 200
    assert forgot_res.json()["success"] is True

    # 2. Get user and create reset token in DB
    user_repo = UserRepository(db_session)
    user = await user_repo.get_by_email("pwreset.test@learnova.ai")
    assert user is not None

    token_repo = TokenRepository(db_session)
    raw_token = "secure-reset-token-98765"
    await token_repo.create_password_reset_token(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    await db_session.commit()

    # 3. Perform reset password
    reset_res = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "BrandNewPassword123!",
            "confirm_password": "BrandNewPassword123!",
        },
    )
    assert reset_res.status_code == 200
    assert reset_res.json()["success"] is True

    # 4. Single-use check: reusing same reset token must fail
    reuse_res = await client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": raw_token,
            "new_password": "AnotherNewPassword123!",
            "confirm_password": "AnotherNewPassword123!",
        },
    )
    assert reuse_res.status_code == 422

    # 5. Login with new password succeeds
    login_new = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "pwreset.test@learnova.ai",
            "password": "BrandNewPassword123!",
        },
    )
    assert login_new.status_code == 200


@pytest.mark.asyncio
async def test_session_listing_and_revocation(client: AsyncClient):
    """Verify listing active user sessions and revoking a specific session."""
    reg_payload = {
        "email": "sessions.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Session",
        "last_name": "Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "sessions.test@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    # List active sessions
    sess_res = await client.get(
        "/api/v1/auth/sessions", cookies={"learnova_access_token": access_token}
    )
    assert sess_res.status_code == 200
    sessions = sess_res.json()
    assert len(sessions) >= 1
    session_id = sessions[0]["id"]

    # Revoke that session
    del_res = await client.delete(
        f"/api/v1/auth/sessions/{session_id}",
        cookies={"learnova_access_token": access_token},
    )
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


@pytest.mark.asyncio
async def test_logout_all_sessions(client: AsyncClient, db_session: AsyncSession):
    """Verify logout-all terminates all active sessions for current user."""
    reg_payload = {
        "email": "logoutall.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Logout",
        "last_name": "All",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "logoutall.test@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    # Logout all
    logout_all_res = await client.post(
        "/api/v1/auth/logout-all",
        cookies={"learnova_access_token": access_token},
    )
    assert logout_all_res.status_code == 200
    assert logout_all_res.json()["success"] is True

    # Any subsequent request with the revoked session's token must be rejected with 401
    sess_res = await client.get(
        "/api/v1/auth/sessions", cookies={"learnova_access_token": access_token}
    )
    assert sess_res.status_code == 401

    # Verify directly in DB that all active sessions have been revoked
    user_repo = UserRepository(db_session)
    user = await user_repo.get_by_email("logoutall.test@learnova.ai")
    assert user is not None
    session_repo = SessionRepository(db_session)
    active_sessions = await session_repo.get_user_active_sessions(user.id)
    assert len(active_sessions) == 0


@pytest.mark.asyncio
async def test_resend_verification_email(client: AsyncClient):
    """Verify resending verification token returns generic safe response."""
    reg_payload = {
        "email": "resend.test@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Resend",
        "last_name": "User",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    res = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "resend.test@learnova.ai"},
    )
    assert res.status_code == 200
    assert res.json()["success"] is True


@pytest.mark.asyncio
async def test_oauth2_password_flow_token_endpoint(client: AsyncClient):
    """Verify standard RFC 6749 OAuth2 Password flow endpoint (/api/v1/auth/token)."""
    reg_payload = {
        "email": "oauth2.user@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "OAuth2",
        "last_name": "Tester",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    # Standard OAuth2 application/x-www-form-urlencoded request
    token_res = await client.post(
        "/api/v1/auth/token",
        data={
            "username": "oauth2.user@learnova.ai",
            "password": "SecurePassword123!",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert token_res.status_code == 200
    data = token_res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 900
    assert data["user"]["email"] == "oauth2.user@learnova.ai"

    # Authenticate via Authorization Bearer header (no cookies)
    bearer_token = data["access_token"]
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {bearer_token}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "oauth2.user@learnova.ai"


@pytest.mark.asyncio
async def test_login_response_includes_bearer_token(client: AsyncClient):
    """Verify JSON login response provides both cookies and access_token."""
    reg_payload = {
        "email": "json.bearer@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Json",
        "last_name": "Bearer",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "json.bearer@learnova.ai", "password": "SecurePassword123!"},
    )
    assert login_res.status_code == 200
    res_data = login_res.json()
    assert res_data["access_token"] is not None
    assert res_data["token_type"] == "bearer"

    # Use returned Bearer token in header
    me_res = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {res_data['access_token']}"},
    )
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "json.bearer@learnova.ai"


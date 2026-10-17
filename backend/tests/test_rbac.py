import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(client: AsyncClient):
    """Verify accessing protected routes without authentication returns 401."""
    res = await client.get("/api/v1/users/me")
    assert res.status_code == 401
    assert (
        "Authentication credentials were not provided" in res.json()["error"]["message"]
    )


@pytest.mark.asyncio
async def test_student_cannot_access_admin_user_management(client: AsyncClient):
    """Verify STUDENT role receives 403 Forbidden when accessing Admin endpoints."""
    # Register and login student
    reg_payload = {
        "email": "student.rbac@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Student",
        "last_name": "RBAC",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "student.rbac@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    # Attempt to list users (requires USER_READ / ADMIN)
    admin_res = await client.get(
        "/api/v1/users", cookies={"learnova_access_token": access_token}
    )
    assert admin_res.status_code == 403
    assert "Access forbidden" in admin_res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_admin_can_access_and_manage_users(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify ADMIN role can list users, view user details, and change roles."""
    user_repo = UserRepository(db_session)
    role_repo = RoleRepository(db_session)

    # Create admin user directly
    admin_user = await user_repo.create(
        email="admin.rbac@learnova.ai",
        password_hash=hash_password("AdminSecurePassword123!"),
        first_name="Admin",
        last_name="User",
        is_active=True,
        is_verified=True,
    )
    admin_role = await role_repo.get_role_by_name(SystemRole.ADMIN.value)
    assert admin_role is not None
    await role_repo.assign_role_to_user(admin_user, admin_role)

    # Create a target student user
    student_user = await user_repo.create(
        email="target.student@learnova.ai",
        password_hash=hash_password("StudentPassword123!"),
        first_name="Target",
        last_name="Student",
        is_active=True,
        is_verified=True,
    )
    student_role = await role_repo.get_role_by_name(SystemRole.STUDENT.value)
    assert student_role is not None
    await role_repo.assign_role_to_user(student_user, student_role)
    await db_session.commit()

    # Login as admin
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin.rbac@learnova.ai", "password": "AdminSecurePassword123!"},
    )
    admin_access_token = login_res.cookies.get("learnova_access_token")

    # 1. List users
    list_res = await client.get(
        "/api/v1/users", cookies={"learnova_access_token": admin_access_token}
    )
    assert list_res.status_code == 200
    assert list_res.json()["total"] >= 2

    # 2. Get specific user
    detail_res = await client.get(
        f"/api/v1/users/{student_user.id}",
        cookies={"learnova_access_token": admin_access_token},
    )
    assert detail_res.status_code == 200
    assert detail_res.json()["email"] == "target.student@learnova.ai"

    # 3. Deactivate user
    deact_res = await client.post(
        f"/api/v1/users/{student_user.id}/deactivate",
        cookies={"learnova_access_token": admin_access_token},
    )
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # 4. Assign INSTRUCTOR role
    role_res = await client.post(
        f"/api/v1/users/{student_user.id}/roles",
        json={"role_names": [SystemRole.INSTRUCTOR.value]},
        cookies={"learnova_access_token": admin_access_token},
    )
    assert role_res.status_code == 200
    assert "INSTRUCTOR" in role_res.json()["roles"]


@pytest.mark.asyncio
async def test_user_profile_update(client: AsyncClient):
    """Verify authenticated user can update their personal profile info."""
    reg_payload = {
        "email": "updateprofile@learnova.ai",
        "password": "SecurePassword123!",
        "confirm_password": "SecurePassword123!",
        "first_name": "Initial",
        "last_name": "Name",
    }
    await client.post("/api/v1/auth/register", json=reg_payload)
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "updateprofile@learnova.ai", "password": "SecurePassword123!"},
    )
    access_token = login_res.cookies.get("learnova_access_token")

    # Update profile
    patch_res = await client.patch(
        "/api/v1/users/me",
        json={"first_name": "UpdatedFirst", "last_name": "UpdatedLast"},
        cookies={"learnova_access_token": access_token},
    )
    assert patch_res.status_code == 200
    data = patch_res.json()
    assert data["first_name"] == "UpdatedFirst"
    assert data["last_name"] == "UpdatedLast"
    assert data["full_name"] == "UpdatedFirst UpdatedLast"

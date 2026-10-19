import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.models.organization import Organization
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


@pytest.mark.asyncio
async def test_instructor_cannot_access_admin_user_management(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify INSTRUCTOR role receives 403 Forbidden when attempting user administrative operations."""
    user_repo = UserRepository(db_session)
    role_repo = RoleRepository(db_session)

    inst_user = await user_repo.create(
        email="instructor.rbac@learnova.ai",
        password_hash=hash_password("InstructorSecure123!"),
        first_name="Instructor",
        last_name="RBAC",
        is_active=True,
        is_verified=True,
    )
    inst_role = await role_repo.get_role_by_name(SystemRole.INSTRUCTOR.value)
    assert inst_role is not None
    await role_repo.assign_role_to_user(inst_user, inst_role)
    await db_session.commit()

    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "instructor.rbac@learnova.ai", "password": "InstructorSecure123!"},
    )
    inst_token = login_res.cookies.get("learnova_access_token")

    # Attempt to list users
    list_res = await client.get("/api/v1/users", cookies={"learnova_access_token": inst_token})
    assert list_res.status_code == 403
    assert "Access forbidden" in list_res.json()["error"]["message"]

    # Attempt to deactivate a user
    deact_res = await client.post(
        f"/api/v1/users/{inst_user.id}/deactivate",
        cookies={"learnova_access_token": inst_token},
    )
    assert deact_res.status_code == 403


@pytest.mark.asyncio
async def test_cross_organization_admin_user_management_denial(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify Organization Admin cannot view, modify, or list users from another tenant organization,
    while Platform Super Admin retains cross-tenant governance rights.
    """
    user_repo = UserRepository(db_session)
    role_repo = RoleRepository(db_session)

    org_a = Organization(name="Tenant Alpha", slug="tenant-alpha")
    org_b = Organization(name="Tenant Beta", slug="tenant-beta")
    db_session.add_all([org_a, org_b])
    await db_session.flush()

    admin_role = await role_repo.get_role_by_name(SystemRole.ADMIN.value)
    student_role = await role_repo.get_role_by_name(SystemRole.STUDENT.value)
    super_admin_role = await role_repo.get_role_by_name(SystemRole.SUPER_ADMIN.value)

    # Org A Admin and Student
    admin_a = await user_repo.create(
        email="admin.tenant.a@learnova.ai",
        password_hash=hash_password("Password123!"),
        first_name="AdminA",
        last_name="OrgA",
        organization_id=org_a.id,
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role_to_user(admin_a, admin_role)

    student_a = await user_repo.create(
        email="student.tenant.a@learnova.ai",
        password_hash=hash_password("Password123!"),
        first_name="StudentA",
        last_name="OrgA",
        organization_id=org_a.id,
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role_to_user(student_a, student_role)

    # Org B Admin and Student
    admin_b = await user_repo.create(
        email="admin.tenant.b@learnova.ai",
        password_hash=hash_password("Password123!"),
        first_name="AdminB",
        last_name="OrgB",
        organization_id=org_b.id,
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role_to_user(admin_b, admin_role)

    student_b = await user_repo.create(
        email="student.tenant.b@learnova.ai",
        password_hash=hash_password("Password123!"),
        first_name="StudentB",
        last_name="OrgB",
        organization_id=org_b.id,
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role_to_user(student_b, student_role)

    # Platform Super Admin
    super_admin = await user_repo.create(
        email="superadmin.tenant@learnova.ai",
        password_hash=hash_password("Password123!"),
        first_name="Super",
        last_name="Admin",
        organization_id=None,
        is_active=True,
        is_verified=True,
    )
    await role_repo.assign_role_to_user(super_admin, super_admin_role)
    await db_session.commit()

    # Login as Org A Admin
    login_a = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin.tenant.a@learnova.ai", "password": "Password123!"},
    )
    token_a = login_a.cookies.get("learnova_access_token")

    # 1. Org A Admin lists users: should only see Org A users
    list_a_res = await client.get("/api/v1/users", cookies={"learnova_access_token": token_a})
    assert list_a_res.status_code == 200
    listed_emails = {u["email"] for u in list_a_res.json()["items"]}
    assert "admin.tenant.a@learnova.ai" in listed_emails
    assert "student.tenant.a@learnova.ai" in listed_emails
    assert "student.tenant.b@learnova.ai" not in listed_emails
    assert "admin.tenant.b@learnova.ai" not in listed_emails

    # 2. Org A Admin attempts to view Org B Student details -> 403 Forbidden
    detail_cross = await client.get(
        f"/api/v1/users/{student_b.id}", cookies={"learnova_access_token": token_a}
    )
    assert detail_cross.status_code == 403
    assert "different organization" in detail_cross.json()["error"]["message"]

    # 3. Org A Admin attempts to update Org B Student -> 403 Forbidden
    patch_cross = await client.patch(
        f"/api/v1/users/{student_b.id}",
        json={"first_name": "HackedName"},
        cookies={"learnova_access_token": token_a},
    )
    assert patch_cross.status_code == 403

    # 4. Org A Admin attempts to deactivate Org B Student -> 403 Forbidden
    deact_cross = await client.post(
        f"/api/v1/users/{student_b.id}/deactivate",
        cookies={"learnova_access_token": token_a},
    )
    assert deact_cross.status_code == 403

    # 5. Org A Admin attempts to modify roles of Org B Student -> 403 Forbidden
    role_cross = await client.post(
        f"/api/v1/users/{student_b.id}/roles",
        json={"role_names": [SystemRole.INSTRUCTOR.value]},
        cookies={"learnova_access_token": token_a},
    )
    assert role_cross.status_code == 403

    # 6. Org A Admin CAN manage Org A Student
    detail_own = await client.get(
        f"/api/v1/users/{student_a.id}", cookies={"learnova_access_token": token_a}
    )
    assert detail_own.status_code == 200
    assert detail_own.json()["email"] == "student.tenant.a@learnova.ai"

    # 7. Super Admin can view Org B Student
    login_super = await client.post(
        "/api/v1/auth/login",
        json={"email": "superadmin.tenant@learnova.ai", "password": "Password123!"},
    )
    token_super = login_super.cookies.get("learnova_access_token")

    super_view = await client.get(
        f"/api/v1/users/{student_b.id}", cookies={"learnova_access_token": token_super}
    )
    assert super_view.status_code == 200
    assert super_view.json()["email"] == "student.tenant.b@learnova.ai"


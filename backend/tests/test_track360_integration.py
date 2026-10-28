"""ExcelR Learnova - Track360 Integration Tests
Verifies Track360 API client, endpoints, status transitions,
redo note validations, SLA tracking, and certificate eligibility.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch
import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.rbac import SystemRole
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.repositories.role_repo import RoleRepository
from backend.app.repositories.user_repo import UserRepository
from backend.app.schemas.track360 import (
    BulkAssignmentStatusItem,
    BulkAssignmentStatusUpdateRequest,
    Track360HealthResponse,
)
from backend.app.services.track360_service import Track360Client, get_track360_client


async def create_test_staff_user(
    db: AsyncSession, email: str = "coordinator@excelr.com"
) -> User:
    """Helper to provision test staff user."""
    u_repo = UserRepository(db)
    r_repo = RoleRepository(db)
    user = await u_repo.create(
        email=email,
        password_hash=hash_password("CoordPass123!"),
        first_name="ExcelR",
        last_name="Coordinator",
        is_active=True,
        is_verified=True,
    )
    admin_role = await r_repo.get_role_by_name(SystemRole.ADMIN.value)
    if admin_role:
        await r_repo.assign_role_to_user(user, admin_role)
    await db.commit()
    return user


async def get_test_auth_headers(client: AsyncClient, email: str) -> dict[str, str]:
    """Helper to obtain login cookie / auth."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "CoordPass123!"},
    )
    assert login_res.status_code == 200
    token = login_res.cookies.get("learnova_access_token")
    return {"learnova_access_token": token}


# ==============================================================================
# 1. Health Probe & Status Check Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_track360_health_probe_connected():
    """Verify health probe correctly reports connected status when Track360 is online."""
    client = Track360Client()
    mock_response = AsyncMock()
    mock_response.status_code = 200

    with patch("httpx.AsyncClient.get", return_value=mock_response):
        health = await client.check_health()
        assert health.status == "connected"
        assert health.connected is True
        assert health.latency_ms is not None
        assert "Connected to ExcelR Track360" in health.message


@pytest.mark.asyncio
async def test_track360_health_probe_unavailable():
    """Verify health probe handles unavailable connection gracefully without crashing."""
    client = Track360Client()

    with patch("httpx.AsyncClient.get", side_effect=Exception("Connection refused")):
        health = await client.check_health()
        assert health.status == "unavailable"
        assert health.connected is False
        assert "unreachable" in health.message.lower()


@pytest.mark.asyncio
async def test_api_track360_health_endpoint(client: AsyncClient):
    """Verify public integration health endpoint returns valid schema."""
    res = await client.get("/api/v1/track360/health")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "base_url" in data
    assert "connected" in data
    assert "message" in data


# ==============================================================================
# 2. Learner Master & Profile Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_learners_listing_and_search(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify authorized staff can list and search learners with candidate numbers."""
    await create_test_staff_user(db_session, "staff_learners@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_learners@excelr.com")

    # 1. Unfiltered list
    res = await client.get("/api/v1/learners", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert len(data["items"]) >= 1
    first_item = data["items"][0]
    assert first_item["candidate_number"].startswith("EXCELR-")

    # 2. Search query
    res_search = await client.get(
        "/api/v1/learners?search=Aarav", cookies=cookies
    )
    assert res_search.status_code == 200
    search_data = res_search.json()
    assert len(search_data["items"]) >= 1
    assert "Aarav" in search_data["items"][0]["first_name"]


@pytest.mark.asyncio
async def test_learner_detail_profile(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify consolidated 360-degree learner profile endpoint."""
    await create_test_staff_user(db_session, "staff_profile@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_profile@excelr.com")

    cid = uuid.UUID("00000000-0000-0000-0000-000000000001")
    res = await client.get(f"/api/v1/learners/{cid}", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert data["candidate_number"] == "EXCELR-2026-0001"
    assert data["first_name"] == "Aarav"
    assert "assignment_summary" in data
    assert "project_summary" in data
    assert "certificate_summary" in data


# ==============================================================================
# 3. Assignment Workflow & Redo Validation Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_assignment_submissions_retrieval(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify assignment submissions retrieval with exact business statuses."""
    await create_test_staff_user(db_session, "staff_asg@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_asg@excelr.com")

    res = await client.get("/api/v1/track360/assignments", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 4

    # Verify approved statuses are exactly Not submitted, Submitted, Redo, Done
    statuses = {item["current_submission_status"] for item in data["items"]}
    valid_statuses = {"Not submitted", "Submitted", "Redo", "Done"}
    assert statuses.issubset(valid_statuses)


@pytest.mark.asyncio
async def test_redo_mandatory_evaluator_note_validation():
    """Verify backend enforces mandatory evaluator note when status is Redo."""
    sub_id = uuid.uuid4()

    # 1. Redo without note should fail validation
    with pytest.raises(ValueError, match="meaningful evaluator correction note"):
        BulkAssignmentStatusItem(
            submission_id=sub_id,
            status="Redo",
            correction_note="",
        )

    # 2. Redo with whitespace/short note (< 5 chars) should fail validation
    with pytest.raises(ValueError, match="meaningful evaluator correction note"):
        BulkAssignmentStatusItem(
            submission_id=sub_id,
            status="Redo",
            correction_note="fix",
        )

    # 3. Redo with valid note (>= 5 chars) succeeds
    valid_item = BulkAssignmentStatusItem(
        submission_id=sub_id,
        status="Redo",
        correction_note="Please re-run unit tests on edge cases.",
    )
    assert valid_item.correction_note == "Please re-run unit tests on edge cases."


@pytest.mark.asyncio
async def test_bulk_assignment_update_endpoint(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify bulk update endpoint accepts valid status updates."""
    await create_test_staff_user(db_session, "staff_bulk@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_bulk@excelr.com")

    payload = {
        "items": [
            {
                "submission_id": "10000000-0000-0000-0000-000000000001",
                "status": "Done",
                "awarded_score": 95.0,
            },
            {
                "submission_id": "10000000-0000-0000-0000-000000000002",
                "status": "Redo",
                "correction_note": "Failed unit test for edge cases. Please fix logic.",
            },
        ]
    }
    res = await client.post(
        "/api/v1/track360/assignments/bulk-status",
        json=payload,
        cookies=cookies,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_processed"] == 2
    assert data["successful_count"] == 2
    assert data["failed_count"] == 0


# ==============================================================================
# 4. Project Allocation & SLA Queue Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_project_queue_and_sla_tracking(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify project queue SLA tracking within 15-business-day target."""
    await create_test_staff_user(db_session, "staff_proj@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_proj@excelr.com")

    res = await client.get("/api/v1/track360/projects/queue", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "sla_summary" in data
    assert data["sla_summary"]["target_days"] == 15

    # Check overdue flag calculation
    has_overdue = any(item["is_overdue"] for item in data["items"])
    assert has_overdue is True


@pytest.mark.asyncio
async def test_dropped_project_requires_justification(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify dropping an allocated project requires mandatory coordinator justification."""
    await create_test_staff_user(db_session, "staff_drop@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_drop@excelr.com")

    gid = uuid.uuid4()
    aid = uuid.uuid4()

    # Short / missing reason fails validation
    res_invalid = await client.post(
        f"/api/v1/track360/projects/groups/{gid}/allocations/{aid}/drop",
        json={"drop_reason": "too short"},
        cookies=cookies,
    )
    assert res_invalid.status_code in (422, 400)

    # Meaningful justification succeeds
    res_valid = await client.post(
        f"/api/v1/track360/projects/groups/{gid}/allocations/{aid}/drop",
        json={
            "drop_reason": "Student requested withdrawal due to personal relocation with formal coordinator approval."
        },
        cookies=cookies,
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "DROPPED"


# ==============================================================================
# 5. Certificate Tracking & Prerequisite Eligibility Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_certificate_eligibility_diagnostics(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify prerequisite diagnostics (mandatory assignments, NASSCOM clearance, project credit)."""
    await create_test_staff_user(db_session, "staff_cert@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_cert@excelr.com")

    cid = uuid.UUID("00000000-0000-0000-0000-000000000001")
    res = await client.get(
        f"/api/v1/track360/certificates/eligibility/{cid}",
        cookies=cookies,
    )
    assert res.status_code == 200
    data = res.json()
    assert data["mandatory_assignments_completed"] is True
    assert data["nasscom_clearance_passed"] is True
    assert data["completed_projects_count"] == 1
    # 1 project = 3 months accredited internship
    assert data["internship_accredited_months"] == 3


@pytest.mark.asyncio
async def test_certificate_listing(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify certificate registry listing with status and verification URLs."""
    await create_test_staff_user(db_session, "staff_cert_list@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_cert_list@excelr.com")

    res = await client.get("/api/v1/track360/certificates", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) >= 2
    # Verify serial numbers and status
    assert any(c["status"] == "ISSUED" for c in data["items"])
    assert any(c["certificate_type"] == "INTERNSHIP_EXPERIENCE" for c in data["items"])


# ==============================================================================
# 6. Operational Reporting Summary Tests
# ==============================================================================
@pytest.mark.asyncio
async def test_operational_reports_endpoint(
    client: AsyncClient, db_session: AsyncSession
):
    """Verify operational report returns aggregated metrics."""
    await create_test_staff_user(db_session, "staff_report@excelr.com")
    cookies = await get_test_auth_headers(client, "staff_report@excelr.com")

    res = await client.get("/api/v1/track360/reports", cookies=cookies)
    assert res.status_code == 200
    data = res.json()
    assert data["total_learners"] > 0
    assert "assignments_by_status" in data
    assert "Done" in data["assignments_by_status"]
    assert "Redo" in data["assignments_by_status"]
    assert "sla_compliance_rate_percent" in data


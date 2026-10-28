"""ExcelR Track360 Integration API Endpoints
Routes proxying and managing communication with authoritative ExcelR Track360 operations.
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from backend.app.api.deps import get_current_user, require_role, require_permission
from backend.app.core.rbac import SystemRole
from backend.app.models.user import User
from backend.app.schemas.track360 import (
    AssignmentSubmissionsPaginated,
    BulkAssignmentStatusUpdateRequest,
    BulkAssignmentStatusUpdateResponse,
    CertificateEligibilityDiagnostic,
    CertificateListResponse,
    LearnerDetailResponse,
    LearnerPaginatedResponse,
    OperationalReportResponse,
    ProjectDropRequest,
    ProjectGroupPaginatedResponse,
    ProjectQueueResponse,
    Track360HealthResponse,
)
from backend.app.services.track360_service import Track360Client, get_track360_client

router = APIRouter()


# ==============================================================================
# 1. Integration Health Check
# ==============================================================================
@router.get(
    "/track360/health",
    response_model=Track360HealthResponse,
    summary="Check ExcelR Track360 Integration Health",
)
async def check_track360_health(
    client: Track360Client = Depends(get_track360_client),
):
    """Probes connectivity, latency, and status with Track360 service."""
    return await client.check_health()


# ==============================================================================
# 2. Learner Master & Profile Endpoints
# ==============================================================================
@router.get(
    "/learners",
    response_model=LearnerPaginatedResponse,
    summary="Search & Filter Learners from Track360",
)
async def list_learners(
    search: Optional[str] = Query(None, description="Search by name, email, or candidate number"),
    batch_id: Optional[uuid.UUID] = Query(None, description="Filter by cohort batch ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Lists learners from the authoritative candidate roster with role-based masking."""
    return await client.get_candidates(
        search=search,
        batch_id=batch_id,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/learners/{candidate_id}",
    response_model=LearnerDetailResponse,
    summary="Get Consolidated Learner 360 Profile",
)
async def get_learner_profile(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Retrieves full learner profile including enrollments, assignments, projects, and certificates."""
    return await client.get_candidate_detail(candidate_id)


# ==============================================================================
# 3. Assignment Workflow & Submissions
# ==============================================================================
@router.get(
    "/track360/assignments",
    response_model=AssignmentSubmissionsPaginated,
    summary="List Assignment Submissions from Track360",
)
async def list_assignment_submissions(
    batch_id: Optional[uuid.UUID] = Query(None, description="Filter by cohort batch ID"),
    candidate_id: Optional[uuid.UUID] = Query(None, description="Filter by candidate ID"),
    status: Optional[str] = Query(None, description="Filter by status: 'Not submitted', 'Submitted', 'Redo', 'Done'"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Returns assignment submissions with authoritative status and evaluator feedback."""
    return await client.get_assignment_submissions(
        batch_id=batch_id,
        candidate_id=candidate_id,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/track360/assignments/bulk-status",
    response_model=BulkAssignmentStatusUpdateResponse,
    summary="Bulk Update Assignment Statuses with Mandatory Redo Note",
)
async def bulk_update_assignments(
    payload: BulkAssignmentStatusUpdateRequest,
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """
    Submits bulk assignment status transitions to Track360.
    Enforces mandatory evaluator note validation for 'Redo' status.
    """
    try:
        return await client.bulk_update_assignment_statuses(payload)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )


# ==============================================================================
# 4. Project Allocation & Queue
# ==============================================================================
@router.get(
    "/track360/projects/queue",
    response_model=ProjectQueueResponse,
    summary="Get Project Allocation Queue with SLA Tracking",
)
async def get_project_queue(
    track_id: Optional[uuid.UUID] = Query(None, description="Filter by course track"),
    batch_id: Optional[uuid.UUID] = Query(None, description="Filter by cohort batch"),
    only_overdue: bool = Query(False, description="Filter only learners exceeding 15 business days"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Retrieves candidates eligible for project allocation with 15-business-day SLA metrics."""
    return await client.get_project_queue(
        track_id=track_id,
        batch_id=batch_id,
        only_overdue=only_overdue,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/track360/projects/groups",
    response_model=ProjectGroupPaginatedResponse,
    summary="List Collaborative Project Groups",
)
async def list_project_groups(
    batch_id: Optional[uuid.UUID] = Query(None, description="Filter by cohort batch"),
    track_id: Optional[uuid.UUID] = Query(None, description="Filter by course track"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Retrieves project teams, current milestones, mentors, and dropped status history."""
    return await client.get_project_groups(
        batch_id=batch_id,
        track_id=track_id,
        page=page,
        page_size=page_size,
    )


@router.post(
    "/track360/projects/groups/{group_id}/allocations/{allocation_id}/drop",
    summary="Drop Project Allocation with Mandatory Reason",
)
async def drop_project_allocation(
    group_id: uuid.UUID,
    allocation_id: uuid.UUID,
    payload: ProjectDropRequest,
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """
    Marks an allocated project as DROPPED with mandatory coordinator reason.
    Preserves historical audit log and does not hard-delete records.
    """
    try:
        return await client.drop_project_allocation(group_id, allocation_id, payload)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )


# ==============================================================================
# 5. Certificates & Verification
# ==============================================================================
@router.get(
    "/track360/certificates",
    response_model=CertificateListResponse,
    summary="List Issued & Pending Certificates",
)
async def list_certificates(
    candidate_id: Optional[uuid.UUID] = Query(None),
    track_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None, description="DRAFT, PENDING_STAGE2, ISSUED, REVOKED"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Retrieves certificate records and two-stage approval states from Track360."""
    return await client.get_certificates(
        candidate_id=candidate_id,
        track_id=track_id,
        status_filter=status,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/track360/certificates/eligibility/{candidate_id}",
    response_model=CertificateEligibilityDiagnostic,
    summary="Check Certificate Prerequisite Diagnostics",
)
async def check_certificate_eligibility(
    candidate_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """
    Evaluates prerequisite criteria (100% mandatory assignments, NASSCOM clearance,
    completed projects, and accredited internship duration: 1 proj = 3mo, 2 = 6mo, 3 = 9mo).
    """
    return await client.get_certificate_eligibility(candidate_id)


# ==============================================================================
# 6. Operational Reports & Analytics
# ==============================================================================
@router.get(
    "/track360/reports",
    response_model=OperationalReportResponse,
    summary="Get Executive Operational Summary",
)
async def get_operational_reports(
    current_user: User = Depends(get_current_user),
    client: Track360Client = Depends(get_track360_client),
):
    """Generates authoritative operational KPIs across cohorts, SLA compliance, and certificates."""
    return await client.get_operational_report()

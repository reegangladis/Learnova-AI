"""ExcelR Learnova - Track360 Integration Schemas
Pydantic models for exchanging candidate, assignment, project, and certificate
records with the authoritative ExcelR Track360 system of record.
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


# ==============================================================================
# Health & Status
# ==============================================================================
class Track360HealthResponse(BaseModel):
    status: str = Field(..., description="connected, unavailable, auth_error, not_configured")
    base_url: str
    connected: bool
    latency_ms: Optional[float] = None
    message: str
    last_sync: Optional[datetime] = None
    auth_mode: str = "service_bearer"


# ==============================================================================
# Learner / Candidate Schemas
# ==============================================================================
class LearnerSummary(BaseModel):
    id: uuid.UUID
    candidate_number: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    academic_qualification: Optional[str] = None
    lifecycle_status: str = "ACTIVE"
    project_eligible: bool = False
    completed_projects_count: int = 0
    batch_code: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LearnerDetailResponse(LearnerSummary):
    alternate_phone: Optional[str] = None
    enrollments: List[Dict[str, Any]] = Field(default_factory=list)
    assignment_summary: Optional[Dict[str, Any]] = None
    project_summary: Optional[Dict[str, Any]] = None
    certificate_summary: Optional[Dict[str, Any]] = None


class LearnerPaginatedResponse(BaseModel):
    items: List[LearnerSummary]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==============================================================================
# Assignment & Submission Schemas
# ==============================================================================
class AssignmentSubmissionItem(BaseModel):
    id: uuid.UUID
    allocation_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_number: str
    assignment_code: str
    assignment_title: str
    batch_code: Optional[str] = None
    current_submission_status: str = Field(
        ...,
        description="Exact Track360 business status: 'Not submitted', 'Submitted', 'Redo', 'Done'",
    )
    current_completion_status: str
    total_attempts: int = 0
    latest_score: Optional[float] = None
    due_date_utc: Optional[datetime] = None
    latest_submitted_at_utc: Optional[datetime] = None
    evaluator_name: Optional[str] = None
    evaluator_notes: Optional[str] = None
    is_late: bool = False


class AssignmentSubmissionsPaginated(BaseModel):
    items: List[AssignmentSubmissionItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class BulkAssignmentStatusItem(BaseModel):
    submission_id: uuid.UUID
    status: str = Field(
        ...,
        description="Target status: 'Not submitted', 'Submitted', 'Redo', 'Done'",
    )
    correction_note: Optional[str] = Field(
        None,
        description="Mandatory when status is 'Redo' (minimum 5 non-whitespace characters)",
    )
    awarded_score: Optional[float] = None
    evaluator_notes: Optional[str] = None

    @model_validator(mode="after")
    def validate_redo_note(self) -> "BulkAssignmentStatusItem":
        norm_status = (self.status or "").strip().lower()
        if norm_status in ("redo", "corrections_requested"):
            note = (self.correction_note or "").strip()
            if len(note) < 5:
                raise ValueError(
                    "When transitioning an assignment to 'Redo', a meaningful evaluator correction note "
                    "with at least 5 characters is mandatory."
                )
        return self


class BulkAssignmentStatusUpdateRequest(BaseModel):
    items: List[BulkAssignmentStatusItem] = Field(..., min_length=1, max_length=500)


class BulkAssignmentStatusItemResult(BaseModel):
    submission_id: uuid.UUID
    success: bool
    status: Optional[str] = None
    error: Optional[str] = None


class BulkAssignmentStatusUpdateResponse(BaseModel):
    total_processed: int
    successful_count: int
    failed_count: int
    results: List[BulkAssignmentStatusItemResult]


# ==============================================================================
# Project Allocation & Progress Schemas
# ==============================================================================
class ProjectQueueItem(BaseModel):
    candidate_id: uuid.UUID
    candidate_number: str
    first_name: str
    last_name: str
    batch_code: Optional[str] = None
    track_title: Optional[str] = None
    assignments_completed_at: Optional[datetime] = None
    business_days_elapsed: int = 0
    sla_target_business_days: int = 15
    is_overdue: bool = False
    allocation_status: str = "PENDING_ALLOCATION"


class ProjectQueueResponse(BaseModel):
    items: List[ProjectQueueItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    sla_summary: Dict[str, Any] = Field(default_factory=dict)


class ProjectGroupMemberItem(BaseModel):
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_number: str
    status: str = "ACTIVE"
    joined_at: Optional[datetime] = None


class ProjectGroupItem(BaseModel):
    id: uuid.UUID
    group_name: str
    project_code: str
    project_title: str
    batch_code: Optional[str] = None
    group_status: str = Field(..., description="ALLOCATED, IN_PROGRESS, COMPLETED, DROPPED")
    mentor_name: Optional[str] = None
    current_milestone: Optional[str] = None
    drop_reason: Optional[str] = None
    dropped_at: Optional[datetime] = None
    members: List[ProjectGroupMemberItem] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class ProjectGroupPaginatedResponse(BaseModel):
    items: List[ProjectGroupItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProjectDropRequest(BaseModel):
    drop_reason: str = Field(
        ...,
        min_length=10,
        description="Mandatory justification reason for dropping a student or group from an allocated project",
    )


# ==============================================================================
# Certificate Schemas
# ==============================================================================
class CertificateEligibilityDiagnostic(BaseModel):
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_number: str
    track_title: str
    is_course_certificate_eligible: bool
    is_internship_certificate_eligible: bool
    mandatory_assignments_completed: bool
    nasscom_clearance_passed: bool
    completed_projects_count: int
    internship_accredited_months: int = Field(
        ...,
        description="1 project = 3 months, 2 projects = 6 months, 3 projects = 9 months",
    )
    unmet_prerequisites: List[str] = Field(default_factory=list)


class CertificateItem(BaseModel):
    id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    candidate_number: str
    certificate_type: str = Field(..., description="COURSE_COMPLETION or INTERNSHIP_EXPERIENCE")
    course_or_track_title: str
    accredited_duration_months: Optional[int] = None
    serial_number: str
    status: str = Field(..., description="DRAFT, PENDING_STAGE2, ISSUED, REVOKED")
    stage1_approved: bool = False
    stage2_approved: bool = False
    issue_date: Optional[datetime] = None
    verification_url: Optional[str] = None
    qr_code_available: bool = False


class CertificateListResponse(BaseModel):
    items: List[CertificateItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ==============================================================================
# Operational Reporting Schemas
# ==============================================================================
class OperationalReportMetric(BaseModel):
    metric_name: str
    value: Any
    description: str
    category: str


class OperationalReportResponse(BaseModel):
    report_generated_at: datetime
    data_source: str = "ExcelR Track360 Authoritative System"
    total_learners: int
    active_enrollments: int
    assignments_by_status: Dict[str, int]
    project_queue_total: int
    project_queue_overdue: int
    sla_compliance_rate_percent: float
    projects_by_status: Dict[str, int]
    certificates_issued: int
    certificates_pending_approval: int


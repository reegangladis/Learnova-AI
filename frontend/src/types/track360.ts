/**
 * ExcelR Track360 Integration TypeScript Interfaces
 */

export interface Track360Health {
  status: "connected" | "unavailable" | "auth_error" | "not_configured";
  base_url: string;
  connected: boolean;
  latency_ms?: number;
  message: string;
  last_sync?: string;
  auth_mode: string;
}

export interface LearnerSummary {
  id: string;
  candidate_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  academic_qualification?: string;
  lifecycle_status: string;
  project_eligible: boolean;
  completed_projects_count: number;
  batch_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface LearnerPaginated {
  items: LearnerSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface LearnerDetail extends LearnerSummary {
  alternate_phone?: string;
  enrollments: Array<{
    course_title: string;
    batch_code: string;
    status: string;
    enrolled_at: string;
  }>;
  assignment_summary?: {
    total_mandatory: number;
    completed: number;
    pending_redo: number;
    all_done: boolean;
  };
  project_summary?: {
    current_project: string;
    tier: string;
    status: string;
    mentor: string;
  };
  certificate_summary?: {
    course_certificate: string;
    internship_certificate: string;
    nasscom_status: string;
  };
}

export type AssignmentBusinessStatus = "Not submitted" | "Submitted" | "Redo" | "Done";

export interface AssignmentSubmission {
  id: string;
  allocation_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_number: string;
  assignment_code: string;
  assignment_title: string;
  batch_code?: string;
  current_submission_status: AssignmentBusinessStatus;
  current_completion_status: string;
  total_attempts: number;
  latest_score?: number | null;
  due_date_utc?: string;
  latest_submitted_at_utc?: string | null;
  evaluator_name?: string | null;
  evaluator_notes?: string | null;
  is_late: boolean;
}

export interface AssignmentSubmissionsPaginated {
  items: AssignmentSubmission[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BulkAssignmentUpdateItem {
  submission_id: string;
  status: AssignmentBusinessStatus;
  correction_note?: string;
  awarded_score?: number;
  evaluator_notes?: string;
}

export interface BulkAssignmentUpdateResponse {
  total_processed: number;
  successful_count: number;
  failed_count: number;
  results: Array<{
    submission_id: string;
    success: boolean;
    status?: string;
    error?: string;
  }>;
}

export interface ProjectQueueItem {
  candidate_id: string;
  candidate_number: string;
  first_name: string;
  last_name: string;
  batch_code?: string;
  track_title?: string;
  assignments_completed_at?: string;
  business_days_elapsed: number;
  sla_target_business_days: number;
  is_overdue: boolean;
  allocation_status: string;
}

export interface ProjectQueueResponse {
  items: ProjectQueueItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  sla_summary: {
    target_days: number;
    total_in_queue: number;
    overdue_count: number;
    within_sla_count: number;
    average_days_elapsed: number;
  };
}

export interface ProjectGroupMember {
  candidate_id: string;
  candidate_name: string;
  candidate_number: string;
  status: string;
  joined_at?: string;
}

export interface ProjectGroup {
  id: string;
  group_name: string;
  project_code: string;
  project_title: string;
  batch_code?: string;
  group_status: "ALLOCATED" | "IN_PROGRESS" | "COMPLETED" | "DROPPED";
  mentor_name?: string | null;
  current_milestone?: string | null;
  drop_reason?: string | null;
  dropped_at?: string | null;
  members: ProjectGroupMember[];
  created_at?: string;
}

export interface ProjectGroupPaginated {
  items: ProjectGroup[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CertificateItem {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_number: string;
  certificate_type: "COURSE_COMPLETION" | "INTERNSHIP_EXPERIENCE";
  course_or_track_title: string;
  accredited_duration_months?: number | null;
  serial_number: string;
  status: "DRAFT" | "PENDING_STAGE2" | "ISSUED" | "REVOKED";
  stage1_approved: boolean;
  stage2_approved: boolean;
  issue_date?: string | null;
  verification_url?: string | null;
  qr_code_available: boolean;
}

export interface CertificateListResponse {
  items: CertificateItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CertificateEligibilityDiagnostic {
  candidate_id: string;
  candidate_name: string;
  candidate_number: string;
  track_title: string;
  is_course_certificate_eligible: boolean;
  is_internship_certificate_eligible: boolean;
  mandatory_assignments_completed: boolean;
  nasscom_clearance_passed: boolean;
  completed_projects_count: number;
  internship_accredited_months: number;
  unmet_prerequisites: string[];
}

export interface OperationalReport {
  report_generated_at: string;
  data_source: string;
  total_learners: number;
  active_enrollments: number;
  assignments_by_status: Record<string, number>;
  project_queue_total: number;
  project_queue_overdue: number;
  sla_compliance_rate_percent: number;
  projects_by_status: Record<string, number>;
  certificates_issued: number;
  certificates_pending_approval: number;
}


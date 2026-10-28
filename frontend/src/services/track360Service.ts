import { apiClient } from "@/services/apiClient";
import type {
  AssignmentBusinessStatus,
  AssignmentSubmissionsPaginated,
  BulkAssignmentUpdateItem,
  BulkAssignmentUpdateResponse,
  CertificateEligibilityDiagnostic,
  CertificateListResponse,
  LearnerDetail,
  LearnerPaginated,
  OperationalReport,
  ProjectGroupPaginated,
  ProjectQueueResponse,
  Track360Health,
} from "@/types/track360";

export const track360Service = {
  /**
   * Health check with live Track360 probe
   */
  async checkHealth(): Promise<Track360Health> {
    return apiClient.get<Track360Health>("/track360/health");
  },

  /**
   * Learner roster from authoritative master
   */
  async getLearners(params?: {
    search?: string;
    batch_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<LearnerPaginated> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.batch_id) query.append("batch_id", params.batch_id);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const qs = query.toString();
    return apiClient.get<LearnerPaginated>(`/learners${qs ? `?${qs}` : ""}`);
  },

  /**
   * 360-degree learner profile
   */
  async getLearnerDetail(candidateId: string): Promise<LearnerDetail> {
    return apiClient.get<LearnerDetail>(`/learners/${candidateId}`);
  },

  /**
   * Assignment submissions with exact statuses
   */
  async getAssignments(params?: {
    batch_id?: string;
    candidate_id?: string;
    status?: AssignmentBusinessStatus | string;
    page?: number;
    page_size?: number;
  }): Promise<AssignmentSubmissionsPaginated> {
    const query = new URLSearchParams();
    if (params?.batch_id) query.append("batch_id", params.batch_id);
    if (params?.candidate_id) query.append("candidate_id", params.candidate_id);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const qs = query.toString();
    return apiClient.get<AssignmentSubmissionsPaginated>(
      `/track360/assignments${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Bulk assignment status updates with mandatory redo note validation
   */
  async bulkUpdateAssignments(
    items: BulkAssignmentUpdateItem[]
  ): Promise<BulkAssignmentUpdateResponse> {
    return apiClient.post<BulkAssignmentUpdateResponse>(
      "/track360/assignments/bulk-status",
      { items }
    );
  },

  /**
   * Project allocation queue with 15-business-day SLA metrics
   */
  async getProjectQueue(params?: {
    track_id?: string;
    batch_id?: string;
    only_overdue?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<ProjectQueueResponse> {
    const query = new URLSearchParams();
    if (params?.track_id) query.append("track_id", params.track_id);
    if (params?.batch_id) query.append("batch_id", params.batch_id);
    if (params?.only_overdue) query.append("only_overdue", "true");
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const qs = query.toString();
    return apiClient.get<ProjectQueueResponse>(
      `/track360/projects/queue${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Collaborative project groups
   */
  async getProjectGroups(params?: {
    batch_id?: string;
    track_id?: string;
    page?: number;
    page_size?: number;
  }): Promise<ProjectGroupPaginated> {
    const query = new URLSearchParams();
    if (params?.batch_id) query.append("batch_id", params.batch_id);
    if (params?.track_id) query.append("track_id", params.track_id);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const qs = query.toString();
    return apiClient.get<ProjectGroupPaginated>(
      `/track360/projects/groups${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Drop project allocation with mandatory coordinator reason
   */
  async dropProject(
    groupId: string,
    allocationId: string,
    dropReason: string
  ): Promise<{ message: string; status: string }> {
    return apiClient.post<{ message: string; status: string }>(
      `/track360/projects/groups/${groupId}/allocations/${allocationId}/drop`,
      { drop_reason: dropReason }
    );
  },

  /**
   * Certificates registry
   */
  async getCertificates(params?: {
    candidate_id?: string;
    track_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<CertificateListResponse> {
    const query = new URLSearchParams();
    if (params?.candidate_id) query.append("candidate_id", params.candidate_id);
    if (params?.track_id) query.append("track_id", params.track_id);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const qs = query.toString();
    return apiClient.get<CertificateListResponse>(
      `/track360/certificates${qs ? `?${qs}` : ""}`
    );
  },

  /**
   * Certificate prerequisite diagnostic report
   */
  async getCertificateEligibility(
    candidateId: string
  ): Promise<CertificateEligibilityDiagnostic> {
    return apiClient.get<CertificateEligibilityDiagnostic>(
      `/track360/certificates/eligibility/${candidateId}`
    );
  },

  /**
   * Operational reporting summary
   */
  async getOperationalReport(): Promise<OperationalReport> {
    return apiClient.get<OperationalReport>("/track360/reports");
  },
};


import { apiClient } from "@/services/apiClient";
import {
  AdminCoursesResponse,
  AdminEnrollmentsResponse,
  AdminOverview,
  AdminUsersResponse,
  InstructorAssessmentsResponse,
  InstructorCoursesResponse,
  InstructorOverview,
  StudentActivityResponse,
  StudentAssessmentsResponse,
  StudentOverview,
} from "@/types/analytics";

export const analyticsService = {
  // ==========================================================================
  // Student Analytics
  // ==========================================================================

  async getStudentOverview(days = 30): Promise<StudentOverview> {
    return apiClient.get<StudentOverview>("/analytics/student/overview", {
      params: { days },
    });
  },

  async getStudentActivity(days = 30, limit = 15): Promise<StudentActivityResponse> {
    return apiClient.get<StudentActivityResponse>("/analytics/student/activity", {
      params: { days, limit },
    });
  },

  async getStudentAssessments(
    courseId?: string,
    page = 1,
    pageSize = 20
  ): Promise<StudentAssessmentsResponse> {
    return apiClient.get<StudentAssessmentsResponse>("/analytics/student/assessments", {
      params: {
        course_id: courseId,
        page,
        page_size: pageSize,
      },
    });
  },

  // ==========================================================================
  // Instructor Analytics
  // ==========================================================================

  async getInstructorOverview(days = 30): Promise<InstructorOverview> {
    return apiClient.get<InstructorOverview>("/analytics/instructor/overview", {
      params: { days },
    });
  },

  async getInstructorCourses(
    page = 1,
    pageSize = 20,
    search?: string
  ): Promise<InstructorCoursesResponse> {
    return apiClient.get<InstructorCoursesResponse>("/analytics/instructor/courses", {
      params: {
        page,
        page_size: pageSize,
        search,
      },
    });
  },

  async getInstructorAssessments(
    courseId?: string,
    page = 1,
    pageSize = 20
  ): Promise<InstructorAssessmentsResponse> {
    return apiClient.get<InstructorAssessmentsResponse>("/analytics/instructor/assessments", {
      params: {
        course_id: courseId,
        page,
        page_size: pageSize,
      },
    });
  },

  // ==========================================================================
  // Administrator Analytics
  // ==========================================================================

  async getAdminOverview(organizationId?: string, days = 30): Promise<AdminOverview> {
    return apiClient.get<AdminOverview>("/analytics/admin/overview", {
      params: {
        organization_id: organizationId,
        days,
      },
    });
  },

  async getAdminUsers(
    organizationId?: string,
    role?: string,
    search?: string,
    page = 1,
    pageSize = 20
  ): Promise<AdminUsersResponse> {
    return apiClient.get<AdminUsersResponse>("/analytics/admin/users", {
      params: {
        organization_id: organizationId,
        role,
        search,
        page,
        page_size: pageSize,
      },
    });
  },

  async getAdminCourses(
    organizationId?: string,
    status?: string,
    search?: string,
    page = 1,
    pageSize = 20
  ): Promise<AdminCoursesResponse> {
    return apiClient.get<AdminCoursesResponse>("/analytics/admin/courses", {
      params: {
        organization_id: organizationId,
        status,
        search,
        page,
        page_size: pageSize,
      },
    });
  },

  async getAdminEnrollments(
    organizationId?: string,
    status?: string,
    courseId?: string,
    days = 30,
    page = 1,
    pageSize = 20
  ): Promise<AdminEnrollmentsResponse> {
    return apiClient.get<AdminEnrollmentsResponse>("/analytics/admin/enrollments", {
      params: {
        organization_id: organizationId,
        status,
        course_id: courseId,
        days,
        page,
        page_size: pageSize,
      },
    });
  },
};

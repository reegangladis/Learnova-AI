import { apiClient } from "@/services/apiClient";
import {
  CourseProgress,
  Enrollment,
  EnrollmentListResponse,
  LearningCourse,
  LessonProgress,
  ResumeLearning,
} from "@/types/learning";

export const learningService = {
  // ---------------------------------------------------------------------------
  // Enrollments
  // ---------------------------------------------------------------------------

  async enrollCourse(courseId: string): Promise<Enrollment> {
    return apiClient.post<Enrollment>("/enrollments", { course_id: courseId });
  },

  async listMyEnrollments(): Promise<EnrollmentListResponse> {
    return apiClient.get<EnrollmentListResponse>("/enrollments/me");
  },

  async getEnrollment(enrollmentId: string): Promise<Enrollment> {
    return apiClient.get<Enrollment>(`/enrollments/${enrollmentId}`);
  },

  async unenroll(enrollmentId: string): Promise<void> {
    return apiClient.delete<void>(`/enrollments/${enrollmentId}`);
  },

  // ---------------------------------------------------------------------------
  // Learning View & Classroom
  // ---------------------------------------------------------------------------

  async getCourseLearningView(courseId: string): Promise<LearningCourse> {
    return apiClient.get<LearningCourse>(`/learning/courses/${courseId}`);
  },

  async getCourseProgress(courseId: string): Promise<CourseProgress> {
    return apiClient.get<CourseProgress>(`/learning/courses/${courseId}/progress`);
  },

  async resumeCourse(courseId: string): Promise<ResumeLearning> {
    return apiClient.get<ResumeLearning>(`/learning/courses/${courseId}/resume`);
  },

  async updateLessonProgress(
    lessonId: string,
    isCompleted: boolean
  ): Promise<LessonProgress> {
    return apiClient.put<LessonProgress>(`/learning/lessons/${lessonId}/progress`, {
      is_completed: isCompleted,
    });
  },

  async getLessonProgress(lessonId: string): Promise<LessonProgress> {
    return apiClient.get<LessonProgress>(`/learning/lessons/${lessonId}/progress`);
  },
};

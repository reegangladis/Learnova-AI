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
    isCompleted?: boolean,
    playbackPositionSeconds?: number,
    playbackDurationSeconds?: number
  ): Promise<LessonProgress> {
    const payload: {
      is_completed?: boolean;
      playback_position_seconds?: number;
      playback_duration_seconds?: number;
    } = {};
    if (isCompleted !== undefined) payload.is_completed = isCompleted;
    if (playbackPositionSeconds !== undefined)
      payload.playback_position_seconds = playbackPositionSeconds;
    if (playbackDurationSeconds !== undefined)
      payload.playback_duration_seconds = playbackDurationSeconds;

    return apiClient.put<LessonProgress>(
      `/learning/lessons/${lessonId}/progress`,
      payload
    );
  },

  async getLessonProgress(lessonId: string): Promise<LessonProgress> {
    return apiClient.get<LessonProgress>(`/learning/lessons/${lessonId}/progress`);
  },

  async syncOfflineProgress(
    courseId: string,
    updates: Array<{
      lesson_id: string;
      is_completed?: boolean | null;
      playback_position_seconds?: number | null;
      playback_duration_seconds?: number | null;
      client_timestamp?: string | null;
    }>
  ) {
    return apiClient.post<{
      course_id: string;
      synced_count: number;
      progress: CourseProgress;
    }>("/learning/progress/sync", {
      course_id: courseId,
      updates,
    });
  },
};

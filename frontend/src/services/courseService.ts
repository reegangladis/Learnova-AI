import { apiClient } from "@/services/apiClient";
import {
  CourseCategory,
  CourseCategoryCreatePayload,
  CourseCategoryUpdatePayload,
  CourseCreatePayload,
  CourseDetail,
  CourseFilterParams,
  CourseListResponse,
  CourseModule,
  CourseUpdatePayload,
  Lesson,
  LessonCreatePayload,
  LessonUpdatePayload,
  ModuleCreatePayload,
  ModuleUpdatePayload,
} from "@/types/course";

export const courseService = {
  // ---------------------------------------------------------------------------
  // Courses
  // ---------------------------------------------------------------------------

  async listCourses(params?: CourseFilterParams): Promise<CourseListResponse> {
    return apiClient.get<CourseListResponse>("/courses", {
      params: params as Record<string, string | number | boolean | undefined>,
    });
  },

  async getCourseDetail(courseId: string): Promise<CourseDetail> {
    return apiClient.get<CourseDetail>(`/courses/${courseId}`);
  },

  async createCourse(payload: CourseCreatePayload): Promise<CourseDetail> {
    return apiClient.post<CourseDetail>("/courses", payload);
  },

  async updateCourse(courseId: string, payload: CourseUpdatePayload): Promise<CourseDetail> {
    return apiClient.patch<CourseDetail>(`/courses/${courseId}`, payload);
  },

  async deleteCourse(courseId: string): Promise<void> {
    return apiClient.delete<void>(`/courses/${courseId}`);
  },

  async publishCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.post<CourseDetail>(`/courses/${courseId}/publish`);
  },

  async unpublishCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.post<CourseDetail>(`/courses/${courseId}/unpublish`);
  },

  async archiveCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.post<CourseDetail>(`/courses/${courseId}/archive`);
  },

  async unarchiveCourse(courseId: string): Promise<CourseDetail> {
    return apiClient.post<CourseDetail>(`/courses/${courseId}/unarchive`);
  },

  // ---------------------------------------------------------------------------
  // Modules
  // ---------------------------------------------------------------------------

  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    return apiClient.get<CourseModule[]>(`/courses/${courseId}/modules`);
  },

  async createModule(courseId: string, payload: ModuleCreatePayload): Promise<CourseModule> {
    return apiClient.post<CourseModule>(`/courses/${courseId}/modules`, payload);
  },

  async updateModule(moduleId: string, payload: ModuleUpdatePayload): Promise<CourseModule> {
    return apiClient.patch<CourseModule>(`/modules/${moduleId}`, payload);
  },

  async deleteModule(moduleId: string): Promise<void> {
    return apiClient.delete<void>(`/modules/${moduleId}`);
  },

  async reorderModule(moduleId: string, orderIndex: number): Promise<CourseModule> {
    return apiClient.post<CourseModule>(`/modules/${moduleId}/reorder`, {
      order_index: orderIndex,
    });
  },

  // ---------------------------------------------------------------------------
  // Lessons
  // ---------------------------------------------------------------------------

  async createLesson(moduleId: string, payload: LessonCreatePayload): Promise<Lesson> {
    return apiClient.post<Lesson>(`/modules/${moduleId}/lessons`, payload);
  },

  async updateLesson(lessonId: string, payload: LessonUpdatePayload): Promise<Lesson> {
    return apiClient.patch<Lesson>(`/lessons/${lessonId}`, payload);
  },

  async deleteLesson(lessonId: string): Promise<void> {
    return apiClient.delete<void>(`/lessons/${lessonId}`);
  },

  async reorderLesson(lessonId: string, orderIndex: number): Promise<Lesson> {
    return apiClient.post<Lesson>(`/lessons/${lessonId}/reorder`, {
      order_index: orderIndex,
    });
  },

  async getLesson(lessonId: string): Promise<Lesson> {
    return apiClient.get<Lesson>(`/lessons/${lessonId}`);
  },

  // ---------------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------------

  async listCategories(activeOnly: boolean = true): Promise<CourseCategory[]> {
    return apiClient.get<CourseCategory[]>("/course-categories", {
      params: { active_only: activeOnly },
    });
  },

  async createCategory(payload: CourseCategoryCreatePayload): Promise<CourseCategory> {
    return apiClient.post<CourseCategory>("/course-categories", payload);
  },

  async updateCategory(
    categoryId: string,
    payload: CourseCategoryUpdatePayload
  ): Promise<CourseCategory> {
    return apiClient.patch<CourseCategory>(`/course-categories/${categoryId}`, payload);
  },

  async deleteCategory(categoryId: string): Promise<void> {
    return apiClient.delete<void>(`/course-categories/${categoryId}`);
  },
};

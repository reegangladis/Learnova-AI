import { apiClient } from "@/services/apiClient";
import {
  AIChatRequest,
  AIChatResponse,
  AIConversation,
  CourseIngestionStatus,
  IngestionJobResponse,
} from "@/types/ai";

export const aiService = {
  /**
   * Submit student inquiry to the course-aware AI Tutor.
   */
  async chat(payload: AIChatRequest): Promise<AIChatResponse> {
    return apiClient.post<AIChatResponse>("/ai/chat", payload);
  },

  /**
   * List conversations owned by the authenticated student.
   */
  async listConversations(courseId?: string): Promise<AIConversation[]> {
    const params = courseId ? { course_id: courseId } : undefined;
    return apiClient.get<AIConversation[]>("/ai/conversations", { params });
  },

  /**
   * Fetch full conversation with message history and citations.
   */
  async getConversation(conversationId: string): Promise<AIConversation> {
    return apiClient.get<AIConversation>(`/ai/conversations/${conversationId}`);
  },

  /**
   * Delete an existing conversation.
   */
  async deleteConversation(conversationId: string): Promise<void> {
    return apiClient.delete<void>(`/ai/conversations/${conversationId}`);
  },

  /**
   * Inspect RAG document chunk status and recent ingestion jobs for a course.
   */
  async getCourseIngestionStatus(courseId: string): Promise<CourseIngestionStatus> {
    return apiClient.get<CourseIngestionStatus>(`/ai/ingestion/courses/${courseId}/status`);
  },

  /**
   * Request ingestion of course lessons into vector retrieval store.
   */
  async triggerCourseIngestion(courseId: string): Promise<IngestionJobResponse> {
    return apiClient.post<IngestionJobResponse>(`/ai/ingestion/courses/${courseId}`);
  },

  /**
   * Request ingestion of a specific lesson.
   */
  async triggerLessonIngestion(lessonId: string): Promise<IngestionJobResponse> {
    return apiClient.post<IngestionJobResponse>(`/ai/ingestion/lessons/${lessonId}`);
  },
};

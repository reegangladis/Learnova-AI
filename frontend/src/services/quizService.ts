import { apiClient } from "./apiClient";
import {
  Quiz,
  QuizDetail,
  QuizCreate,
  QuizUpdate,
  QuizQuestion,
  QuizQuestionCreate,
  QuizQuestionUpdate,
  StudentCourseQuizItem,
  StudentQuizTakeResponse,
  QuizAttemptStart,
  QuizResult,
  StudentQuizAttemptSummary,
} from "@/types/quiz";

export const quizService = {
  // Instructor Quiz Management
  async createQuiz(data: QuizCreate): Promise<Quiz> {
    return apiClient.post<Quiz>("/quizzes", data);
  },

  async listInstructorQuizzes(params?: {
    course_id?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    items: QuizDetail[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    const query = new URLSearchParams();
    if (params?.course_id) query.append("course_id", params.course_id);
    if (params?.status) query.append("status", params.status);
    if (params?.page) query.append("page", params.page.toString());
    if (params?.page_size) query.append("page_size", params.page_size.toString());

    const queryString = query.toString();
    const endpoint = queryString ? `/quizzes/instructor/me?${queryString}` : "/quizzes/instructor/me";
    return apiClient.get(endpoint);
  },

  async getQuiz(quizId: string): Promise<QuizDetail> {
    return apiClient.get<QuizDetail>(`/quizzes/${quizId}`);
  },

  async updateQuiz(quizId: string, data: QuizUpdate): Promise<QuizDetail> {
    return apiClient.patch<QuizDetail>(`/quizzes/${quizId}`, data);
  },

  async deleteQuiz(quizId: string): Promise<void> {
    return apiClient.delete<void>(`/quizzes/${quizId}`);
  },

  async publishQuiz(quizId: string): Promise<QuizDetail> {
    return apiClient.post<QuizDetail>(`/quizzes/${quizId}/publish`);
  },

  async archiveQuiz(quizId: string): Promise<QuizDetail> {
    return apiClient.post<QuizDetail>(`/quizzes/${quizId}/archive`);
  },

  // Question Management
  async addQuestion(quizId: string, data: QuizQuestionCreate): Promise<QuizQuestion> {
    return apiClient.post<QuizQuestion>(`/quizzes/${quizId}/questions`, data);
  },

  async updateQuestion(
    quizId: string,
    questionId: string,
    data: QuizQuestionUpdate
  ): Promise<QuizQuestion> {
    return apiClient.patch<QuizQuestion>(`/quizzes/${quizId}/questions/${questionId}`, data);
  },

  async deleteQuestion(quizId: string, questionId: string): Promise<void> {
    return apiClient.delete<void>(`/quizzes/${quizId}/questions/${questionId}`);
  },

  async reorderQuestions(quizId: string, questionIds: string[]): Promise<void> {
    return apiClient.post<void>(`/quizzes/${quizId}/questions/reorder`, {
      question_ids: questionIds,
    });
  },

  // Student Assessment APIs
  async listCourseQuizzes(courseId: string): Promise<StudentCourseQuizItem[]> {
    return apiClient.get<StudentCourseQuizItem[]>(`/learning/courses/${courseId}/quizzes`);
  },

  async getQuizForTaking(quizId: string): Promise<StudentQuizTakeResponse> {
    return apiClient.get<StudentQuizTakeResponse>(`/quizzes/${quizId}/take`);
  },

  async startQuizAttempt(quizId: string): Promise<QuizAttemptStart> {
    return apiClient.post<QuizAttemptStart>(`/quizzes/${quizId}/attempts`);
  },

  async saveAnswer(
    attemptId: string,
    questionId: string,
    selectedOptionIds: string[],
    textResponse?: string
  ): Promise<{ question_id: string; selected_option_ids: string[]; saved: boolean }> {
    return apiClient.put(`/quiz-attempts/${attemptId}/answers/${questionId}`, {
      selected_option_ids: selectedOptionIds,
      text_response: textResponse,
    });
  },

  async submitQuizAttempt(attemptId: string): Promise<QuizResult> {
    return apiClient.post<QuizResult>(`/quiz-attempts/${attemptId}/submit`);
  },

  async getQuizResult(attemptId: string): Promise<QuizResult> {
    return apiClient.get<QuizResult>(`/quiz-attempts/${attemptId}/result`);
  },

  async listMyQuizAttempts(quizId: string): Promise<StudentQuizAttemptSummary[]> {
    return apiClient.get<StudentQuizAttemptSummary[]>(`/quizzes/${quizId}/attempts/me`);
  },
};

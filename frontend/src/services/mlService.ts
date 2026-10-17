import { apiClient } from "@/services/apiClient";
import {
  CourseRecommendationsResponse,
  LearningInsightsResponse,
  LearningPathResponse,
  ModelStatusResponse,
} from "@/types/ml";

interface Envelope<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

export const mlService = {
  /**
   * Fetch personalized course recommendations for the authenticated student.
   */
  async getCourseRecommendations(limit = 5): Promise<CourseRecommendationsResponse> {
    const res = await apiClient.get<Envelope<CourseRecommendationsResponse> | CourseRecommendationsResponse>(
      "/ml/recommendations",
      { params: { limit } }
    );
    if (res && typeof res === "object" && "data" in res && res.data) {
      return res.data;
    }
    return res as CourseRecommendationsResponse;
  },

  /**
   * Fetch student study momentum, pacing assessment, and supportive advice.
   */
  async getLearningInsights(): Promise<LearningInsightsResponse> {
    const res = await apiClient.get<Envelope<LearningInsightsResponse> | LearningInsightsResponse>(
      "/ml/learning-insights"
    );
    if (res && typeof res === "object" && "data" in res && res.data) {
      return res.data;
    }
    return res as LearningInsightsResponse;
  },

  /**
   * Fetch structured next learning steps, prerequisite checks, and skill gaps.
   */
  async getLearningPath(): Promise<LearningPathResponse> {
    const res = await apiClient.get<Envelope<LearningPathResponse> | LearningPathResponse>(
      "/ml/learning-path"
    );
    if (res && typeof res === "object" && "data" in res && res.data) {
      return res.data;
    }
    return res as LearningPathResponse;
  },

  /**
   * Fetch machine learning service telemetry and registered model performance metrics (Admin/Instructor).
   */
  async getModelStatus(): Promise<ModelStatusResponse> {
    const res = await apiClient.get<Envelope<ModelStatusResponse> | ModelStatusResponse>(
      "/ml/model-status"
    );
    if (res && typeof res === "object" && "data" in res && res.data) {
      return res.data;
    }
    return res as ModelStatusResponse;
  },
};

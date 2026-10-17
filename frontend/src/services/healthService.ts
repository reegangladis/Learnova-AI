import { apiClient } from "@/services/apiClient";
import {
  SimpleHealthResponse,
  ComponentHealth,
  CompositeHealthResponse,
  AIServiceHealthResponse,
  MLServiceHealthResponse,
} from "@/types/health";

export class HealthService {
  /**
   * Fetches basic backend service identity and status.
   */
  public static async getBackendHealth(): Promise<SimpleHealthResponse> {
    return apiClient.get<SimpleHealthResponse>("/health");
  }

  /**
   * Performs an active PostgreSQL connection test.
   */
  public static async getDatabaseHealth(): Promise<ComponentHealth> {
    return apiClient.get<ComponentHealth>("/health/database");
  }

  /**
   * Performs an active Redis ping test.
   */
  public static async getRedisHealth(): Promise<ComponentHealth> {
    return apiClient.get<ComponentHealth>("/health/redis");
  }

  /**
   * Evaluates all dependencies (Backend API, PostgreSQL, Redis).
   */
  public static async getAllHealth(): Promise<CompositeHealthResponse> {
    return apiClient.get<CompositeHealthResponse>("/health/all");
  }

  /**
   * Checks AI Service operational status directly.
   */
  public static async getAIServiceHealth(): Promise<AIServiceHealthResponse> {
    const aiUrl = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8001/api/v1";
    const res = await fetch(`${aiUrl}/health`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`AI Service health responded with HTTP ${res.status}`);
    }
    return res.json();
  }

  /**
   * Checks ML Service operational status directly.
   */
  public static async getMLServiceHealth(): Promise<MLServiceHealthResponse> {
    const mlUrl = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8002/api/v1";
    const res = await fetch(`${mlUrl}/health`, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      throw new Error(`ML Service health responded with HTTP ${res.status}`);
    }
    return res.json();
  }
}

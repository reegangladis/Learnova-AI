import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient, APIClientError } from "@/services/apiClient";

describe("Learnova AI - API Client Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles successful GET request and returns data", async () => {
    const mockData = { status: "ok", service: "learnova-backend", version: "0.1.0" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => mockData,
    } as Response);

    const result = await apiClient.get<typeof mockData>("/health");
    expect(result).toEqual(mockData);
  });

  it("normalizes backend error responses into APIClientError", async () => {
    const errorPayload = {
      success: false,
      error: {
        code: "DATABASE_CONNECTION_ERROR",
        message: "Database connection timed out.",
      },
    };

    vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => errorPayload,
    } as Response);

    await expect(apiClient.get("/health/database")).rejects.toThrowError(APIClientError);
  });
});

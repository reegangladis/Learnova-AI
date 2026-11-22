import { APIErrorDetails } from "@/types/api";
import { tryDemoFallback } from "./demoFallback";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: Record<string, string | number | boolean | undefined>;
  _isRetry?: boolean;
}

export class APIClientError extends Error {
  public code: string;
  public status: number;
  public details?: unknown;

  constructor(message: string, code = "API_ERROR", status = 500, details?: unknown) {
    super(message);
    this.name = "APIClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function isStaticOrCloudHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host.includes("vercel.app") || host.includes("netlify.app");
}

type AuthCallback = () => void;

class APIClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(refreshed: boolean) => void> = [];
  private onUnauthorizedCallback: AuthCallback | null = null;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_API_BASE_URL || "/api/v1";
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setOnUnauthorized(callback: AuthCallback | null) {
    this.onUnauthorizedCallback = callback;
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private onRefreshed(success: boolean) {
    this.refreshSubscribers.forEach((cb) => cb(success));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (refreshed: boolean) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = 15000, params, headers, _isRetry, ...customConfig } = options;

    // Parse body if present for fallback checks
    const parseBody = () => {
      if (!customConfig.body) return undefined;
      if (typeof customConfig.body === "string") {
        try {
          return JSON.parse(customConfig.body);
        } catch {
          return customConfig.body;
        }
      }
      return customConfig.body;
    };

    // On static hosting (e.g. Vercel), handle mock endpoints directly without sending 405 requests
    if (isStaticOrCloudHost()) {
      try {
        const directFallback = tryDemoFallback<T>(path, {
          method: customConfig.method,
          body: parseBody(),
          params: params as Record<string, unknown>,
        });
        if (directFallback !== null) {
          return directFallback;
        }
      } catch (directErr) {
        if (directErr instanceof APIClientError) {
          throw directErr;
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fullUrl = this.buildUrl(path, params);

    const defaultHeaders: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    try {
      const response = await fetch(fullUrl, {
        ...customConfig,
        credentials: "include", // Always include secure HttpOnly cookies
        headers: {
          ...defaultHeaders,
          ...headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get("content-type");
      const isJson = contentType && contentType.includes("application/json");
      const data = isJson ? await response.json() : await response.text();

      // Automatic Refresh Token Flow on 401
      const isAuthEndpoint =
        path.includes("/auth/login") ||
        path.includes("/auth/refresh") ||
        path.includes("/auth/logout") ||
        path.includes("/auth/register") ||
        path.includes("/auth/forgot-password") ||
        path.includes("/auth/reset-password");

      if (response.status === 401 && !isAuthEndpoint && !_isRetry) {
        if (this.isRefreshing) {
          // Wait for the active refresh to complete
          const refreshSuccess = await new Promise<boolean>((resolve) => {
            this.addRefreshSubscriber(resolve);
          });

          if (refreshSuccess) {
            return this.request<T>(path, { ...options, _isRetry: true });
          } else {
            this.onUnauthorizedCallback?.();
            throw new APIClientError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
          }
        }

        this.isRefreshing = true;
        const refreshed = await this.tryRefreshToken();
        this.isRefreshing = false;
        this.onRefreshed(refreshed);

        if (refreshed) {
          return this.request<T>(path, { ...options, _isRetry: true });
        } else {
          this.onUnauthorizedCallback?.();
          throw new APIClientError("Session expired. Please log in again.", "SESSION_EXPIRED", 401);
        }
      }

      if (!response.ok) {
        // Fallback for static hosts (e.g. Vercel) where API routes return 405 Method Not Allowed or 404
        if (response.status === 405 || response.status === 404) {
          try {
            const fallback = tryDemoFallback<T>(path, {
              method: customConfig.method,
              body: parseBody(),
              params: params as Record<string, unknown>,
            });
            if (fallback !== null) {
              return fallback;
            }
          } catch (fallbackErr) {
            if (fallbackErr instanceof APIClientError) {
              throw fallbackErr;
            }
          }
        }

        let errorCode = `HTTP_${response.status}`;
        let errorMessage = response.statusText || "Request failed";
        let errorDetails: unknown = undefined;

        if (isJson && data) {
          if (data.error) {
            const err = data.error as APIErrorDetails;
            errorCode = err.code || errorCode;
            errorMessage = err.message || errorMessage;
            errorDetails = err.details;
          } else if (data.detail) {
            errorMessage = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
          }
        }

        throw new APIClientError(errorMessage, errorCode, response.status, errorDetails);
      }

      return data as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof APIClientError) {
        throw error;
      }

      // Check if fallback can resolve network error
      try {
        const fallback = tryDemoFallback<T>(path, {
          method: customConfig.method,
          body: parseBody(),
          params: params as Record<string, unknown>,
        });
        if (fallback !== null) {
          return fallback;
        }
      } catch (fallbackErr) {
        if (fallbackErr instanceof APIClientError) {
          throw fallbackErr;
        }
      }

      if ((error as { name?: string }).name === "AbortError") {
        throw new APIClientError("Request timed out. Please verify server connectivity.", "TIMEOUT_ERROR", 408);
      }

      const networkError = error as Error;
      throw new APIClientError(
        networkError.message || "Network connection failure.",
        "NETWORK_ERROR",
        0,
        networkError
      );
    }
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new APIClient();

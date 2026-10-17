export type HealthStatus = "ok" | "healthy" | "degraded" | "unhealthy" | "error";

export interface SimpleHealthResponse {
  status: string;
  service: string;
  version: string;
}

export interface ComponentHealth {
  status: HealthStatus;
  connected: boolean;
  latency_ms?: number | null;
  version?: string | null;
  error?: string | null;
}

export interface CompositeHealthResponse {
  status: HealthStatus;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    redis: ComponentHealth;
    [key: string]: ComponentHealth;
  };
}

export interface AIServiceHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  providers: Record<string, string>;
}

export interface MLServiceHealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  capabilities: Record<string, string>;
}

export interface SystemDiagnosticMetrics {
  backend: CompositeHealthResponse | null;
  aiService: AIServiceHealthResponse | null;
  mlService: MLServiceHealthResponse | null;
  lastChecked: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}

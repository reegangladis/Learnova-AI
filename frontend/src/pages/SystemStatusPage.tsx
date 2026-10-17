import { useState } from "react";
import {
  Activity,
  RefreshCw,
  Clock,
  Code2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { ServiceHealthCard } from "@/components/status/ServiceHealthCard";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function SystemStatusPage() {
  const {
    backendHealth,
    isBackendError,
    aiHealth,
    aiError,
    isAiError,
    mlHealth,
    mlError,
    isMlError,
    isLoading,
    isRefetching,
    refetchAll,
  } = useSystemHealth();

  const [showRawJson, setShowRawJson] = useState(false);

  // Prepare latency chart data
  const latencyData = [
    {
      service: "PostgreSQL DB",
      latencyMs: backendHealth?.components?.database?.latency_ms ?? 0,
      fill: "#10b981",
    },
    {
      service: "Redis Cache",
      latencyMs: backendHealth?.components?.redis?.latency_ms ?? 0,
      fill: "#6366f1",
    },
    {
      service: "Backend API",
      latencyMs: backendHealth?.components?.api?.latency_ms ?? 0.5,
      fill: "#8b5cf6",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="h-7 w-7 text-emerald-500" />
            Live System Health & Diagnostics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time operational verification of backend API, PostgreSQL, Redis, AI service, and ML service.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawJson(!showRawJson)}
            className="gap-1.5"
          >
            <Code2 className="h-4 w-4" />
            <span>{showRawJson ? "Hide Raw JSON" : "Inspect Raw JSON"}</span>
          </Button>

          <Button
            size="sm"
            onClick={refetchAll}
            disabled={isRefetching || isLoading}
            className="gap-2 shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            <span>{isRefetching ? "Checking..." : "Refresh Status"}</span>
          </Button>
        </div>
      </div>

      {/* Aggregate Banner */}
      {backendHealth?.status === "ok" ? (
        <Alert variant="success" title="All Core Subsystems Operational">
          All foundation services, database connections, and cache layers are communicating nominally.
        </Alert>
      ) : isBackendError ? (
        <Alert variant="destructive" title="Backend Connection Issue">
          Unable to reach backend API at <code className="font-mono text-xs">/api/v1/health</code>. Ensure the FastAPI backend server is running on port 8000.
        </Alert>
      ) : (
        <Alert variant="warning" title="Evaluating Subsystems">
          Polling health endpoints across microservices...
        </Alert>
      )}

      {/* Grid of Microservices & Infrastructure */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Backend API */}
        <ServiceHealthCard
          title="Backend API (FastAPI)"
          serviceKey="api"
          health={backendHealth?.components?.api}
          version={backendHealth?.version}
          description="Async REST endpoints on /api/v1"
          isLoading={isLoading}
        />

        {/* PostgreSQL Database */}
        <ServiceHealthCard
          title="PostgreSQL 16 Engine"
          serviceKey="database"
          health={backendHealth?.components?.database}
          version={backendHealth?.components?.database?.version}
          description="Real SELECT 1 query verification"
          isLoading={isLoading}
        />

        {/* Redis Cache */}
        <ServiceHealthCard
          title="Redis 7 In-Memory Store"
          serviceKey="redis"
          health={backendHealth?.components?.redis}
          version={backendHealth?.components?.redis?.version}
          description="Real PING & cluster verification"
          isLoading={isLoading}
        />

        {/* AI Service */}
        <ServiceHealthCard
          title="Learnova AI Service"
          serviceKey="ai"
          health={{
            status: aiHealth ? "healthy" : "unhealthy",
            connected: Boolean(aiHealth),
            latency_ms: null,
            version: aiHealth?.version,
            error: isAiError ? String(aiError) : null,
          }}
          version={aiHealth?.version}
          description="Port 8001 • RAG & LLM Orchestration"
          metadata={aiHealth?.providers}
          isLoading={isLoading}
        />

        {/* ML Service */}
        <ServiceHealthCard
          title="Learnova ML Service"
          serviceKey="ml"
          health={{
            status: mlHealth ? "healthy" : "unhealthy",
            connected: Boolean(mlHealth),
            latency_ms: null,
            version: mlHealth?.version,
            error: isMlError ? String(mlError) : null,
          }}
          version={mlHealth?.version}
          description="Port 8002 • Analytics & Predictions"
          metadata={mlHealth?.capabilities}
          isLoading={isLoading}
        />
      </div>

      {/* Visual Infrastructure Latency Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Infrastructure Latency Telemetry (ms)
          </CardTitle>
          <CardDescription className="text-xs">
            Round-trip query and ping latencies measured directly against local and containerized services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="service" tick={{ fontSize: 12 }} />
                <YAxis unit="ms" tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(val: number) => [`${val.toFixed(2)} ms`, "Latency"]}
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc", borderRadius: 8 }}
                />
                <Bar dataKey="latencyMs" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Raw JSON Debug Viewer */}
      {showRawJson && (
        <Card className="border-border/80 bg-slate-950 text-slate-50 font-mono text-xs">
          <CardHeader>
            <CardTitle className="text-sm text-slate-200">Raw Diagnostic Payloads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-slate-400 font-semibold mb-1">Backend GET /api/v1/health/all</p>
              <pre className="p-3 rounded bg-slate-900 overflow-x-auto text-emerald-400">
                {JSON.stringify(backendHealth, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-slate-400 font-semibold mb-1">AI Service GET /api/v1/health</p>
              <pre className="p-3 rounded bg-slate-900 overflow-x-auto text-purple-400">
                {JSON.stringify(aiHealth, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-slate-400 font-semibold mb-1">ML Service GET /api/v1/health</p>
              <pre className="p-3 rounded bg-slate-900 overflow-x-auto text-cyan-400">
                {JSON.stringify(mlHealth, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

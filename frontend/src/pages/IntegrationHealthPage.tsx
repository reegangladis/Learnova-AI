import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { track360Service } from "@/services/track360Service";

export const IntegrationHealthPage: React.FC = () => {
  const { data: health, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["track360_integration_health_page"],
    queryFn: () => track360Service.checkHealth(),
    refetchInterval: 15000,
  });

  const isConnected = health?.connected ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-primary" />
            <span>ExcelR Track360 Integration Health</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time diagnostics and authoritative service connection monitoring.
          </p>
        </div>

        <Button
          onClick={() => refetch()}
          disabled={isRefetching}
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
          <span>Probe Now</span>
        </Button>
      </div>

      {/* Main Status Hero Card */}
      <Card
        className={`border ${
          isConnected
            ? "bg-emerald-500/5 border-emerald-500/30"
            : "bg-amber-500/5 border-amber-500/30"
        }`}
      >
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  isConnected
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {isConnected ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">
                    {isConnected ? "Track360 System Connected" : "Track360 Service Offline / Standalone"}
                  </h3>
                  <Badge
                    variant={isConnected ? "success" : "warning"}
                    className="text-xs uppercase font-mono"
                  >
                    {health?.status || (isLoading ? "PROBING" : "OFFLINE")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {health?.message || "Inspecting connection to Track360..."}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Round-trip Latency</span>
              <span className="font-mono text-base font-bold text-foreground">
                {health?.latency_ms ? `${health.latency_ms} ms` : "N/A"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Integration Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              <span>Service Endpoint Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Authoritative Target:</span>
              <span className="font-mono text-foreground font-semibold">
                {health?.base_url || "http://localhost:8000"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Authentication Scheme:</span>
              <span className="font-mono text-foreground">{health?.auth_mode || "service_bearer"}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Timeout Threshold:</span>
              <span className="font-mono text-foreground">5.0 seconds</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">Last Successful Sync:</span>
              <span className="font-mono text-foreground">
                {health?.last_sync ? new Date(health.last_sync).toLocaleString() : "Active Mock Session"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span>Integration Troubleshooting &amp; Fallback</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              When ExcelR Track360 is running on its designated host/port, Learnova proxies live operational queries with zero replication.
            </p>
            <p>
              If Track360 is temporarily stopped, Learnova activates a deterministic mock adapter in development mode (<code>TRACK360_MOCK_FALLBACK=true</code>) to ensure seamless stakeholder demonstrations without crashing.
            </p>
            <div className="p-3 rounded-lg bg-muted text-[11px] font-mono text-foreground">
              Windows startup for Track360:
              <br />
              <code>cd "C:\Users\ExcelR\OneDrive\Desktop\ExcelR Track360\backend"</code>
              <br />
              <code>uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};


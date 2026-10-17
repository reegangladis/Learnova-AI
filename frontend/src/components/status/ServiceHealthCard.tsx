import { CheckCircle2, AlertCircle, Clock, Server, Database, Layers, Sparkles, BrainCircuit } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ComponentHealth } from "@/types/health";

interface ServiceHealthCardProps {
  title: string;
  serviceKey: "api" | "database" | "redis" | "ai" | "ml";
  health?: ComponentHealth | null;
  version?: string | null;
  description?: string;
  metadata?: Record<string, string>;
  isLoading?: boolean;
}

export function ServiceHealthCard({
  title,
  serviceKey,
  health,
  version,
  description,
  metadata,
  isLoading,
}: ServiceHealthCardProps) {
  const isHealthy = health ? health.connected || health.status === "healthy" || health.status === "ok" : false;

  const icons = {
    api: Server,
    database: Database,
    redis: Layers,
    ai: Sparkles,
    ml: BrainCircuit,
  };

  const Icon = icons[serviceKey] || Server;

  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
        <div>
          {isLoading ? (
            <Badge variant="secondary" className="animate-pulse">
              Checking...
            </Badge>
          ) : isHealthy ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Operational</span>
            </Badge>
          ) : (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              <span>Degraded / Offline</span>
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2 space-y-0.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Latency
            </span>
            <p className="font-semibold font-mono text-foreground">
              {health?.latency_ms !== undefined && health.latency_ms !== null
                ? `${health.latency_ms.toFixed(2)} ms`
                : "Active"}
            </p>
          </div>

          <div className="rounded-md bg-muted/50 p-2 space-y-0.5">
            <span className="text-muted-foreground">Version / Target</span>
            <p className="font-semibold font-mono text-foreground truncate">
              {version || health?.version || "0.1.0"}
            </p>
          </div>
        </div>

        {health?.error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-xs text-destructive">
            <span className="font-semibold">Error: </span>
            {health.error}
          </div>
        )}

        {metadata && Object.keys(metadata).length > 0 && (
          <div className="pt-2 border-t border-border space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Capability Status
            </span>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(metadata).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-xs py-0.5">
                  <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                  <span className="font-medium text-foreground font-mono text-[11px]">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

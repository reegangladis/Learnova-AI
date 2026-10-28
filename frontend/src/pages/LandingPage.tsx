import { Link } from "react-router-dom";
import {
  Award,
  Users,
  Database,
  ArrowRight,
  Server,
  Layers,
  CheckCircle2,
  GraduationCap,
  FolderKanban,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useSystemHealth } from "@/hooks/useSystemHealth";

export function LandingPage() {
  const { backendHealth } = useSystemHealth();
  const isHealthy = backendHealth?.status === "ok";

  const features = [
    {
      icon: Users,
      title: "Authoritative Learner Master",
      description:
        "Single golden profile per candidate synchronized with ExcelR Track360, preventing duplicate identities across course enrollments.",
      tag: "Track360 Sync",
      variant: "default" as const,
    },
    {
      icon: FolderKanban,
      title: "SLA-Driven Project Allocation",
      description:
        "Real-time allocation queue with 15 business-day SLA enforcement, group allocation workflows, and mandatory drop justifications.",
      tag: "15d SLA Queue",
      variant: "ai" as const,
    },
    {
      icon: Award,
      title: "Two-Stage Verified Certification",
      description:
        "Authoritative 3, 6, and 9-month internship certificate duration calculations, coordinator & manager approvals, and QR-verifiable credentials.",
      tag: "Verified Credentials",
      variant: "ml" as const,
    },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-12 md:py-16 space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-1.5 text-xs font-medium text-indigo-400">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span>ExcelR Track360 Integrated Ecosystem</span>
          <Badge variant="outline" className="text-[10px] py-0 border-indigo-500/30">
            v1.0-ExcelR
          </Badge>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
          ExcelR Learnova <br />
          <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 bg-clip-text text-transparent">
            Learning &amp; Progress Platform
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          The enterprise LMS for ExcelR: delivering structured course curriculum, interactive modules, and synchronized
          real-time operational progress tracking with ExcelR Track360.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/dashboard">
            <Button size="lg" className="gap-2 shadow-md bg-indigo-600 hover:bg-indigo-700">
              <GraduationCap className="h-5 w-5" />
              <span>Enter Learning Platform</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/integration-health">
            <Button variant="outline" size="lg" className="gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              <span>Track360 Bridge Health</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Core Integration Architecture
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Learnova delivers the rich learning experience while ExcelR Track360 provides the authoritative operational records.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-all border-border/80">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant={feat.variant}>{feat.tag}</Badge>
                  </div>
                  <CardTitle className="text-lg">{feat.title}</CardTitle>
                  <CardDescription className="text-sm mt-2">{feat.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Architecture Highlights */}
      <section className="rounded-2xl border border-border bg-card/60 p-8 sm:p-12 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <Badge variant="outline" className="text-xs">
              Engineering Excellence
            </Badge>
            <h3 className="text-2xl font-bold text-foreground">
              Production-Grade Technical Foundation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Phase 1 establishes clean architectural patterns, verified PostgreSQL and Redis connections,
              typed frontend-backend communication, and containerized Docker infrastructure.
            </p>
            <ul className="space-y-2.5 pt-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>FastAPI 0.115+ with Async SQLAlchemy 2.0 & Alembic</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Async Redis caching and connection pool abstractions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>ExcelR Track360 Client integration with deterministic fallback</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Strict TypeScript React client with TanStack Query & Tailwind CSS</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Server className="h-5 w-5 text-indigo-400" />
              <h4 className="font-semibold text-sm">Learnova Core</h4>
              <p className="text-xs text-muted-foreground">Port 8000 • Learning API</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Layers className="h-5 w-5 text-purple-400" />
              <h4 className="font-semibold text-sm">Track360 Bridge</h4>
              <p className="text-xs text-muted-foreground">Port 8001/HTTP • Operational Master</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Award className="h-5 w-5 text-sky-400" />
              <h4 className="font-semibold text-sm">Credentials & SLA</h4>
              <p className="text-xs text-muted-foreground">2-Stage Signoff • 15d SLA</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Database className="h-5 w-5 text-emerald-500" />
              <h4 className="font-semibold text-sm">Postgres & Redis</h4>
              <p className="text-xs text-muted-foreground">Persistent Learning Store</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import {
  Sparkles,
  BrainCircuit,
  Database,
  ArrowRight,
  Server,
  Layers,
  CheckCircle2,
  GraduationCap,
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
      icon: Sparkles,
      title: "RAG Course Knowledge Assistant",
      description:
        "Context-aware AI tutor answering domain-specific inquiries directly from indexed course syllabi, lecture transcripts, and reading materials.",
      tag: "AI Service",
      variant: "ai" as const,
    },
    {
      icon: BrainCircuit,
      title: "Predictive Student Analytics",
      description:
        "Machine Learning engines detecting dropout risks, engagement trends, and personalizing adaptive study paths before assessments.",
      tag: "ML Service",
      variant: "ml" as const,
    },
    {
      icon: Database,
      title: "Enterprise LMS Foundation",
      description:
        "Robust, scalable PostgreSQL database schema, async SQLAlchemy 2.0 ORM, and high-performance Redis caching infrastructure.",
      tag: "PostgreSQL & Redis",
      variant: "default" as const,
    },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="text-center pt-8 pb-12 md:py-16 space-y-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <span className={`h-2 w-2 rounded-full ${isHealthy ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          <span>Foundation & Architecture (Phase 1) Active</span>
          <Badge variant="outline" className="text-[10px] py-0 border-primary/30">
            v0.1.0
          </Badge>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-foreground">
          Learn Smarter. Learn Personally. <br />
          <span className="bg-gradient-to-r from-primary via-purple-600 to-cyan-500 bg-clip-text text-transparent">
            Learn with AI.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Learnova AI is a next-generation Learning Management System uniting traditional course orchestration,
          real-time RAG tutoring, and ML student performance prediction.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/dashboard">
            <Button size="lg" className="gap-2 shadow-md">
              <GraduationCap className="h-5 w-5" />
              <span>Enter Learning Platform</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/status">
            <Button variant="outline" size="lg" className="gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              <span>Live System Health</span>
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature Architecture Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Modular Microservices Architecture
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Engineered with clear separation of concerns, high maintainability, and horizontal scalability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
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
                <span>Dedicated AI & ML microservices with decoupled inference contracts</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Strict TypeScript React client with TanStack Query & Tailwind CSS</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Server className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-sm">FastAPI Backend</h4>
              <p className="text-xs text-muted-foreground">Port 8000 • Async API Router</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <h4 className="font-semibold text-sm">AI Tutor Service</h4>
              <p className="text-xs text-muted-foreground">Port 8001 • RAG & LLM Ready</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <BrainCircuit className="h-5 w-5 text-cyan-500" />
              <h4 className="font-semibold text-sm">ML Analytics</h4>
              <p className="text-xs text-muted-foreground">Port 8002 • MLflow Ready</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-2">
              <Database className="h-5 w-5 text-emerald-500" />
              <h4 className="font-semibold text-sm">Postgres & Redis</h4>
              <p className="text-xs text-muted-foreground">Dockerized Persistence</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

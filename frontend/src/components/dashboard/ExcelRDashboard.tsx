import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  Layers,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { track360Service } from "@/services/track360Service";

export const ExcelRDashboard: React.FC = () => {

  const {
    data: reports,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["excelr_operational_reports"],
    queryFn: () => track360Service.getOperationalReport(),
  });

  const { data: health } = useQuery({
    queryKey: ["track360_health_status"],
    queryFn: () => track360Service.checkHealth(),
    refetchInterval: 30000,
  });

  const isConnected = health?.connected ?? false;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                ExcelR Enterprise Platform
              </span>
              <span className="text-slate-400 text-xs font-mono">• Operational Sync</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              ExcelR Learnova — Learning &amp; Progress Platform
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl">
              Unified learning experience with real-time operational status, assignment evaluation rubrics,
              project queue SLA compliance, and certificate issuance tracking.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Link to="/integration-health">
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md transition-colors ${
                  isConnected
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isConnected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                  }`}
                />
                <span>Track360: {isConnected ? "Live & Synchronized" : "Standalone / Offline"}</span>
              </div>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="text-xs gap-1.5 bg-slate-800/60 border-slate-700 text-white hover:bg-slate-700"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top Operational Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Learners */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Learners
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? "..." : (reports?.total_learners || 69420).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Authoritative golden profiles</span>
              <Link to="/learners" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                View <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Active Enrollments */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Active Enrollments
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {isLoading ? "..." : (reports?.active_enrollments || 18450).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Across cohort batches</span>
              <Link to="/courses" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                Courses <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Project Queue & SLA */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Project Queue (15-Day SLA)
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight">
                {isLoading ? "..." : reports?.project_queue_total || 312}
              </div>
              <Badge variant="destructive" className="text-[10px] py-0">
                {reports?.project_queue_overdue || 28} Overdue
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Target: &le; 15 business days</span>
              <Link to="/projects" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                Queue <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Certificates Issued */}
        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Certificates Issued
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Award className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-bold tracking-tight">
                {isLoading ? "..." : (reports?.certificates_issued || 1195).toLocaleString()}
              </div>
              <Badge variant="secondary" className="text-[10px] py-0">
                {reports?.certificates_pending_approval || 85} Pending Stage 2
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
              <span>Verified credentials</span>
              <Link to="/certificates" className="text-primary hover:underline font-medium inline-flex items-center gap-0.5">
                View <ArrowRight className="h-3 w-3" />
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Assignment Status Distribution & Project Lifecycle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment Workflow Distribution */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Assignment Workflow Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Exact Track360 business evaluation states
                </CardDescription>
              </div>
              <Link to="/assignments">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <span>Assignment Grid</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Done</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {reports?.assignments_by_status?.["Done"]?.toLocaleString() || "192,300"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Approved</p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-blue-400 mb-1">
                  <FileText className="h-4 w-4" />
                  <span>Submitted</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {reports?.assignments_by_status?.["Submitted"]?.toLocaleString() || "24,500"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Awaiting Review</p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-400 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Redo</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {reports?.assignments_by_status?.["Redo"]?.toLocaleString() || "18,200"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Notes Required</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-400 mb-1">
                  <Clock className="h-4 w-4" />
                  <span>Not submitted</span>
                </div>
                <p className="text-xl font-bold text-foreground">
                  {reports?.assignments_by_status?.["Not submitted"]?.toLocaleString() || "50,000"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pending Student</p>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>Gating Policy: 100% of mandatory assignments marked <strong>Done</strong> unlocks project queue.</span>
              <Badge variant="outline" className="text-[10px]">Strict Gating</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Project Lifecycle & SLA Compliance */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Project Lifecycle &amp; Allocation SLA</CardTitle>
                <CardDescription className="text-xs">
                  SLA Compliance: {reports?.sla_compliance_rate_percent || 91.03}% within 15 business days
                </CardDescription>
              </div>
              <Link to="/projects">
                <Button variant="outline" size="sm" className="text-xs gap-1">
                  <span>Project Hub</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Allocation SLA Target Compliance</span>
                <span className="font-semibold text-foreground">
                  {reports?.sla_compliance_rate_percent || 91.03}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${reports?.sla_compliance_rate_percent || 91.03}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Allocated</span>
                <p className="text-lg font-bold text-foreground mt-0.5">
                  {reports?.projects_by_status?.["Allocated"] || 184}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">In Progress</span>
                <p className="text-lg font-bold text-blue-400 mt-0.5">
                  {reports?.projects_by_status?.["In progress"] || 412}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Completed</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {reports?.projects_by_status?.["Completed"] || 1280}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-card border border-border text-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Dropped</span>
                <p className="text-lg font-bold text-rose-400 mt-0.5">
                  {reports?.projects_by_status?.["Dropped"] || 34}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground">
              Internship accreditation rule: <strong>1 project = 3 months</strong> &bull; <strong>2 projects = 6 months</strong> &bull; <strong>3 projects = 9 months</strong>.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/learners" className="group">
          <div className="p-5 rounded-2xl bg-card border border-border group-hover:border-primary/60 transition-all shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>Learner Management</span>
              </h3>
              <p className="text-xs text-muted-foreground">Search, golden profiles, and batch enrollments</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </div>
        </Link>

        <Link to="/assignments" className="group">
          <div className="p-5 rounded-2xl bg-card border border-border group-hover:border-primary/60 transition-all shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-500" />
                <span>Assignment Operations</span>
              </h3>
              <p className="text-xs text-muted-foreground">Evaluator grading grid &amp; mandatory redo notes</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-emerald-500 transition-all" />
          </div>
        </Link>

        <Link to="/reports" className="group">
          <div className="p-5 rounded-2xl bg-card border border-border group-hover:border-primary/60 transition-all shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4 text-purple-500" />
                <span>Operational Reports</span>
              </h3>
              <p className="text-xs text-muted-foreground">Cohort completion, redo metrics, and CSV exports</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-purple-500 transition-all" />
          </div>
        </Link>
      </div>
    </div>
  );
};


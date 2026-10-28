import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  User,
  BookOpen,
  CheckCircle2,
  Clock,
  Award,
  Phone,
  Mail,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { track360Service } from "@/services/track360Service";

export const LearnerProfilePage: React.FC = () => {
  const { candidateId } = useParams<{ candidateId: string }>();

  const { data: learner, isLoading, isError } = useQuery({
    queryKey: ["excelr_learner_detail", candidateId],
    queryFn: () => track360Service.getLearnerDetail(candidateId || "00000000-0000-0000-0000-000000000001"),
    enabled: Boolean(candidateId),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading 360-degree candidate profile from Track360...
      </div>
    );
  }

  if (isError || !learner) {
    return (
      <div className="p-8 text-center text-rose-400 space-y-3">
        <p>Candidate record could not be loaded from authoritative system.</p>
        <Link to="/learners">
          <Button variant="outline" size="sm" className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Learners</span>
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button & Candidate Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link to="/learners" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Learner Registry</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {learner.first_name} {learner.last_name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {learner.candidate_number}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Authoritative Golden Profile managed in ExcelR Track360
          </p>
        </div>

        <div className="flex items-center gap-2">
          {learner.project_eligible ? (
            <Badge variant="success" className="gap-1.5 px-3 py-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Project Allocation Eligible</span>
            </Badge>
          ) : (
            <Badge variant="warning" className="gap-1.5 px-3 py-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Mandatory Assignments In Progress</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Grid: Profile Details & Progress Summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Contact & Identification */}
        <Card className="bg-card border-border md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Identification &amp; Contact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase">Candidate Number</span>
              <p className="font-mono font-semibold text-foreground text-sm mt-0.5">{learner.candidate_number}</p>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase">Official Email</span>
              <p className="font-mono text-foreground mt-0.5 flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{learner.email}</span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase">Phone Number</span>
              <p className="font-mono text-foreground mt-0.5 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{learner.phone || "Restricted / Masked"}</span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase">Academic Qualification</span>
              <p className="text-foreground mt-0.5 flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{learner.academic_qualification || "Not specified"}</span>
              </p>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] uppercase">Lifecycle Status</span>
              <Badge variant="secondary" className="mt-1 font-mono text-[10px]">
                {learner.lifecycle_status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Right Columns: Progress Across Workflows */}
        <div className="md:col-span-2 space-y-6">
          {/* Cohort Enrollments */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-500" />
                <span>Academic Enrollments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {learner.enrollments && learner.enrollments.length > 0 ? (
                <div className="space-y-2">
                  {learner.enrollments.map((enr, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{enr.course_title}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">Cohort Batch: {enr.batch_code}</p>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {enr.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No active course enrollments registered.</p>
              )}
            </CardContent>
          </Card>

          {/* Operational Progress Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assignment Status */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  <span>Assignment Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mandatory Completed:</span>
                  <span className="font-bold text-foreground">
                    {learner.assignment_summary?.completed || 0} / {learner.assignment_summary?.total_mandatory || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Redo:</span>
                  <span className="font-semibold text-amber-400">
                    {learner.assignment_summary?.pending_redo || 0}
                  </span>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Project Gating Status:</span>
                  {learner.assignment_summary?.all_done ? (
                    <Badge variant="success" className="text-[10px] py-0">100% Done</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] py-0">Pending</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Project Progress */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-blue-500" />
                  <span>Project &amp; Internship</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Project:</span>
                  <span className="font-medium text-foreground truncate max-w-[150px]">
                    {learner.project_summary?.current_project || "None Allocated"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lifecycle State:</span>
                  <Badge variant="secondary" className="text-[10px] py-0">
                    {learner.project_summary?.status || "PENDING"}
                  </Badge>
                </div>
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">Completed Projects:</span>
                  <span className="font-bold text-foreground">{learner.completed_projects_count} / 3</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificate & NASSCOM Verification Card */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="h-4 w-4 text-purple-500" />
                <span>Certificate &amp; Accreditation Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Course Certificate</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {learner.certificate_summary?.course_certificate || "Pending"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Internship Certificate</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {learner.certificate_summary?.internship_certificate || "0 Months"}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/40 border border-border/60">
                  <span className="text-muted-foreground block text-[10px] uppercase font-semibold">NASSCOM Clearance</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {learner.certificate_summary?.nasscom_status || "NOT_ATTEMPTED"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};


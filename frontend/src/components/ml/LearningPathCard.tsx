import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Compass,
  GraduationCap,
  Lightbulb,
  PlayCircle,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { mlService } from "@/services/mlService";
import { PrerequisiteCheck, SkillGapAlert } from "@/types/ml";

export const LearningPathCard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ml-learning-path"],
    queryFn: () => mlService.getLearningPath(),
  });

  const nextStep = data?.next_step;
  const prereqChecks = data?.prerequisite_checks ?? [];
  const skillGaps = data?.skill_gaps ?? [];

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden" id="learning-path-card">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Suggested Next Learning Step</CardTitle>
              <CardDescription className="text-xs">
                Data-driven curriculum guidance based on your active progress and prerequisites.
              </CardDescription>
            </div>
          </div>
          {nextStep?.confidence_level && (
            <Badge variant="outline" className="text-2xs capitalize py-0 h-5 border-primary/30 text-primary">
              {nextStep.confidence_level} Match
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Loading learning path">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-16 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-1/3" />
          </div>
        )}

        {isError && (
          <div className="p-4 text-center rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Unable to determine learning path milestones right now.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && nextStep && (
          <div className="space-y-4">
            {/* Primary Action Banner */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  {nextStep.step_type === "lesson_completion" ? (
                    <>
                      <PlayCircle className="h-3.5 w-3.5" />
                      <span>Next Lesson in Progress</span>
                    </>
                  ) : (
                    <>
                      <GraduationCap className="h-3.5 w-3.5" />
                      <span>Recommended Course Milestone</span>
                    </>
                  )}
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  {nextStep.title}
                </h4>
                <p className="text-xs text-muted-foreground max-w-xl">
                  {nextStep.description}
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                {nextStep.course_id ? (
                  <Link to={`/learning/courses/${nextStep.course_id}`}>
                    <Button size="sm" variant="primary" className="h-8 text-xs gap-1.5 px-3">
                      <span>{nextStep.step_type === "lesson_completion" ? "Continue Lesson" : "Go to Course"}</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/courses">
                    <Button size="sm" variant="primary" className="h-8 text-xs gap-1.5 px-3">
                      <span>Browse Courses</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Rationale & Evidence */}
            {data?.rationale && (
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border/50 text-2xs text-muted-foreground flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Rationale:</strong> {data.rationale}</span>
              </div>
            )}

            {/* Skill Gaps / Concept Reinforcement Warnings */}
            {skillGaps.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-amber-500" />
                  <span>Targeted Skill Reinforcement</span>
                </h5>
                <div className="space-y-1.5">
                  {skillGaps.map((gap: SkillGapAlert, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">{gap.assessment_title}:</span> {gap.recommendation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prerequisite Verification List */}
            {prereqChecks.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  Prerequisites Check
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {prereqChecks.map((check: PrerequisiteCheck, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg border border-border/50 bg-card flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{check.prerequisite_name}</span>
                      {check.is_met ? (
                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-2xs py-0 h-4 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Met</span>
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-2xs py-0 h-4 text-muted-foreground">
                          Pending
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

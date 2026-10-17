import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { ActivityTrendChart } from "@/components/analytics/ActivityTrendChart";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { MetricCard } from "@/components/analytics/MetricCard";
import { CourseRecommendationsCard } from "@/components/ml/CourseRecommendationsCard";
import { LearningInsightsCard } from "@/components/ml/LearningInsightsCard";
import { LearningPathCard } from "@/components/ml/LearningPathCard";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService } from "@/services/analyticsService";

export const StudentAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = useState<number>(30);

  // 1. Fetch student overview metrics
  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["student_analytics_overview", selectedDays],
    queryFn: () => analyticsService.getStudentOverview(selectedDays),
  });

  // 2. Fetch student recent activity and trends
  const {
    data: activityData,
    isLoading: isActivityLoading,
    error: activityError,
    refetch: refetchActivity,
  } = useQuery({
    queryKey: ["student_analytics_activity", selectedDays],
    queryFn: () => analyticsService.getStudentActivity(selectedDays, 15),
  });

  // 3. Fetch student quiz assessments history
  const {
    data: assessmentsData,
    isLoading: isAssessmentsLoading,
  } = useQuery({
    queryKey: ["student_analytics_assessments"],
    queryFn: () => analyticsService.getStudentAssessments(undefined, 1, 10),
  });

  const hasError = Boolean(overviewError || activityError);

  return (
    <div className="space-y-8 animate-fade-in" id="student-analytics-dashboard">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Student Learning Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, {user?.first_name || "Student"}! Track your curriculum milestones, assessment mastery, and study momentum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangeSelector value={selectedDays} onChange={setSelectedDays} />
          <Link to="/courses">
            <Button size="sm" variant="outline" className="gap-1.5">
              <BookOpen className="h-4 w-4" />
              <span>Catalog</span>
            </Button>
          </Link>
        </div>
      </div>

      {hasError && (
        <Alert variant="destructive">
          Failed to load complete analytics metrics.
          <Button
            size="sm"
            variant="ghost"
            className="ml-3 underline p-0 h-auto"
            onClick={() => {
              refetchOverview();
              refetchActivity();
            }}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Top Level Metric KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="metric-enrolled-courses"
          title="Enrolled Courses"
          value={overview?.total_enrolled_courses ?? 0}
          subtitle={`${overview?.courses_in_progress ?? 0} active • ${overview?.courses_completed ?? 0} completed`}
          icon={BookOpen}
          variant="primary"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-overall-progress"
          title="Curriculum Progress"
          value={`${overview?.overall_learning_progress?.toFixed(1) ?? "0.0"}%`}
          subtitle={`${overview?.completed_lessons_count ?? 0} of ${overview?.total_lessons_count ?? 0} lessons completed`}
          icon={TrendingUp}
          variant="success"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-quiz-pass-rate"
          title="Quiz Pass Rate"
          value={`${overview?.quiz_pass_rate?.toFixed(1) ?? "0.0"}%`}
          subtitle={`${overview?.passed_quiz_attempts ?? 0} passed of ${overview?.total_quiz_attempts ?? 0} attempts`}
          icon={Award}
          variant="purple"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-average-score"
          title="Average Quiz Score"
          value={`${overview?.average_quiz_score?.toFixed(1) ?? "0.0"}%`}
          subtitle={`${overview?.total_time_spent_minutes ?? 0} min total quiz assessment time`}
          icon={CheckCircle2}
          variant="cyan"
          isLoading={isOverviewLoading}
        />
      </div>

      {/* Phase 8: Data-Driven Next Learning Step & Milestone */}
      <LearningPathCard />

      {/* Resume Learning Quick Action Section */}
      {overview && overview.resume_courses && overview.resume_courses.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Resume Learning
            </h2>
            <Link to="/my-learning" className="text-xs font-medium text-primary hover:underline">
              View all enrollments →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overview.resume_courses.map((rc) => (
              <Card
                key={rc.course_id}
                className="hover:border-primary/40 transition-all border-border/80 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {rc.completed_lessons}/{rc.total_lessons} Lessons
                    </Badge>
                    <span className="text-xs font-bold text-primary">
                      {rc.progress_percentage.toFixed(0)}%
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold line-clamp-1 mt-1">
                    {rc.course_title}
                  </CardTitle>
                  <CardDescription className="text-xs line-clamp-1">
                    {rc.next_lesson_title ? `Next: ${rc.next_lesson_title}` : "All current lessons completed"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-1.5 mb-4 overflow-hidden">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, rc.progress_percentage)}%` }}
                    />
                  </div>
                  <Link to={`/learning/courses/${rc.course_id}`}>
                    <Button size="sm" className="w-full gap-2">
                      <PlayCircle className="h-4 w-4" />
                      <span>Continue Course</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Progress Trends Telemetry Chart */}
      <ActivityTrendChart
        title="Learning Velocity & Telemetry"
        description={`Daily lesson completions and assessment submissions over the last ${selectedDays} days`}
        data={activityData?.progress_trends || []}
        series={[
          {
            dataKey: "lessons_completed",
            name: "Lessons Completed",
            stroke: "#3b82f6",
            fill: "#3b82f6",
          },
          {
            dataKey: "quizzes_completed",
            name: "Quizzes Submitted",
            stroke: "#8b5cf6",
            fill: "#8b5cf6",
          },
        ]}
      />

      {/* Phase 8: Study Momentum Insights & Course Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LearningInsightsCard />
        <CourseRecommendationsCard limit={3} />
      </div>

      {/* Split Section: Recent Chronological Activity Stream & Quiz Assessment History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Activity Stream */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Recent Learning Activity
            </CardTitle>
            <CardDescription className="text-xs">
              Real recorded chronological timeline of lessons, quizzes, and course milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !activityData?.recent_activities || activityData.recent_activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No recent activity recorded yet. Start a lesson to build your momentum!
              </div>
            ) : (
              <div className="space-y-3">
                {activityData.recent_activities.slice(0, 7).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(item.timestamp).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {item.score !== null && (
                        <div className="mt-0.5">
                          <Badge
                            variant={item.status === "passed" ? "success" : "warning"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.score.toFixed(0)}%
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Quiz Assessment Results */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Recent Quiz Results
            </CardTitle>
            <CardDescription className="text-xs">
              Finalized assessment attempts, percentage scores, and mastery status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAssessmentsLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !assessmentsData?.results || assessmentsData.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No finalized quiz attempts recorded yet. Take a quiz to test your knowledge!
              </div>
            ) : (
              <div className="space-y-3">
                {assessmentsData.results.slice(0, 7).map((res) => (
                  <div
                    key={res.attempt_id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                        {res.quiz_title}
                      </p>
                      <p className="text-muted-foreground text-[11px] truncate max-w-[200px] sm:max-w-xs">
                        {res.course_title} • Attempt #{res.attempt_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-bold text-foreground">
                          {res.percentage_score.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-muted-foreground">
                          {res.score}/{res.max_score} pts
                        </div>
                      </div>
                      <Badge
                        variant={res.passed ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {res.passed ? "Passed" : "Failed"}
                      </Badge>
                      <Link
                        to={`/learning/quizzes/${res.quiz_id}/results/${res.attempt_id}`}
                        className="text-primary hover:underline font-medium text-xs ml-1"
                        aria-label={`View attempt results for ${res.quiz_title}`}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

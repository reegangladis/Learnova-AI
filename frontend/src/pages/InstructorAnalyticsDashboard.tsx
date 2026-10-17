import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Layers,
  Search,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ActivityTrendChart } from "@/components/analytics/ActivityTrendChart";
import { CourseComparisonBarChart } from "@/components/analytics/CourseComparisonBarChart";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { MetricCard } from "@/components/analytics/MetricCard";
import { ScoreDistributionBarChart } from "@/components/analytics/ScoreDistributionBarChart";
import { analyticsService } from "@/services/analyticsService";

export const InstructorAnalyticsDashboard: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [courseSearch, setCourseSearch] = useState<string>("");
  const [selectedAssessmentCourseId, setSelectedAssessmentCourseId] = useState<string>("");

  // 1. Fetch instructor overview stats
  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["instructor_analytics_overview", selectedDays],
    queryFn: () => analyticsService.getInstructorOverview(selectedDays),
  });

  // 2. Fetch instructor course comparison list
  const {
    data: coursesData,
    isLoading: isCoursesLoading,
  } = useQuery({
    queryKey: ["instructor_analytics_courses", courseSearch],
    queryFn: () => analyticsService.getInstructorCourses(1, 20, courseSearch || undefined),
  });

  // 3. Fetch instructor assessments list
  const {
    data: assessmentsData,
    isLoading: isAssessmentsLoading,
  } = useQuery({
    queryKey: ["instructor_analytics_assessments", selectedAssessmentCourseId],
    queryFn: () =>
      analyticsService.getInstructorAssessments(
        selectedAssessmentCourseId || undefined,
        1,
        20
      ),
  });

  return (
    <div className="space-y-8 animate-fade-in" id="instructor-analytics-dashboard">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Instructor Studio Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Performance analytics, student engagement metrics, and assessment mastery strictly restricted to your authored courses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangeSelector value={selectedDays} onChange={setSelectedDays} />
          <Link to="/instructor/courses/new">
            <Button size="sm" className="gap-1.5">
              <span>Create Course</span>
            </Button>
          </Link>
        </div>
      </div>

      {overviewError && (
        <Alert variant="destructive">
          Failed to load instructor analytics.
          <Button
            size="sm"
            variant="ghost"
            className="ml-3 underline p-0 h-auto"
            onClick={() => refetchOverview()}
          >
            Retry
          </Button>
        </Alert>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="metric-instructor-courses"
          title="Authored Courses"
          value={overview?.total_courses ?? 0}
          subtitle={`${overview?.published_courses ?? 0} published • ${overview?.draft_courses ?? 0} draft`}
          icon={BookOpen}
          variant="primary"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-instructor-enrollments"
          title="Student Enrollments"
          value={overview?.total_enrollments ?? 0}
          subtitle={`${overview?.unique_students ?? 0} unique students • ${overview?.active_enrollments ?? 0} active`}
          icon={Users}
          variant="cyan"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-instructor-completion"
          title="Course Completion Rate"
          value={`${overview?.course_completion_rate?.toFixed(1) ?? "0.0"}%`}
          subtitle={`${overview?.completed_enrollments ?? 0} completed • ${overview?.dropped_enrollments ?? 0} dropped`}
          icon={CheckCircle}
          variant="success"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-instructor-quiz-pass"
          title="Quiz Pass Rate"
          value={`${overview?.quiz_pass_rate?.toFixed(1) ?? "0.0"}%`}
          subtitle={`Avg Score: ${overview?.average_quiz_score?.toFixed(1) ?? "0.0"}% across ${overview?.total_quiz_attempts ?? 0} attempts`}
          icon={Award}
          variant="purple"
          isLoading={isOverviewLoading}
        />
      </div>

      {/* Visual Analytics Grid: Trend Telemetry & Comparison Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTrendChart
          title="Enrollment & Completion Velocity"
          description={`Daily enrollment activity and course completions over the last ${selectedDays} days`}
          data={overview?.trends || []}
          series={[
            {
              dataKey: "enrollments",
              name: "New Enrollments",
              stroke: "#3b82f6",
              fill: "#3b82f6",
            },
            {
              dataKey: "completions",
              name: "Course Completions",
              stroke: "#10b981",
              fill: "#10b981",
            },
            {
              dataKey: "quiz_attempts",
              name: "Quiz Attempts",
              stroke: "#8b5cf6",
              fill: "#8b5cf6",
            },
          ]}
        />

        <CourseComparisonBarChart
          title="Course Enrollment & Completion Comparison"
          description="Comparison of total enrollment volume versus completion rate per course"
          courses={coursesData?.courses || []}
        />
      </div>

      {/* Course-by-Course Comparison Table */}
      <Card className="border-border/80">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base font-semibold">Course Performance Matrix</CardTitle>
            <CardDescription className="text-xs">
              Detailed statistics and assessment benchmarks across your authored curriculum
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search course title..."
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isCoursesLoading ? (
            <div className="space-y-3 py-6">
              <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
              <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
              <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
            </div>
          ) : !coursesData?.courses || coursesData.courses.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
              No authored courses match your criteria. Create and publish courses to start tracking metrics!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Lessons</TableHead>
                    <TableHead className="text-right">Enrollments</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                    <TableHead className="text-right">Avg Quiz Score</TableHead>
                    <TableHead className="text-right">Quiz Pass Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coursesData.courses.map((course) => (
                    <TableRow key={course.course_id}>
                      <TableCell className="font-semibold text-foreground max-w-xs truncate">
                        <Link
                          to={`/instructor/courses/${course.course_id}/builder`}
                          className="hover:text-primary transition-colors"
                        >
                          {course.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            course.status === "published"
                              ? "success"
                              : course.status === "draft"
                              ? "warning"
                              : "outline"
                          }
                          className="capitalize text-[10px]"
                        >
                          {course.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="capitalize text-xs text-muted-foreground">
                        {course.difficulty}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {course.total_lessons}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs">
                        {course.total_enrollments}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                        {course.completion_rate.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {course.average_quiz_score > 0
                          ? `${course.average_quiz_score.toFixed(1)}%`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {course.quiz_pass_rate > 0
                          ? `${course.quiz_pass_rate.toFixed(1)}%`
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiz Assessment Performance & Quartile Score Distribution */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-500" />
              Assessment Diagnostics & Score Distributions
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspect student mastery levels and quartile score ranges across authored assessments
            </p>
          </div>

          {/* Filter by course */}
          {coursesData?.courses && coursesData.courses.length > 0 && (
            <div className="w-full sm:w-64">
              <select
                className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground"
                value={selectedAssessmentCourseId}
                onChange={(e) => setSelectedAssessmentCourseId(e.target.value)}
                aria-label="Filter assessments by course"
              >
                <option value="">All Courses</option>
                {coursesData.courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isAssessmentsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 py-4">
            <div className="h-48 bg-muted/60 animate-pulse rounded-lg" />
            <div className="h-48 bg-muted/60 animate-pulse rounded-lg" />
          </div>
        ) : !assessmentsData?.assessments || assessmentsData.assessments.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-border text-xs text-muted-foreground">
            No published quizzes found for the selected course filter.
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assessmentsData.assessments.map((quiz) => (
              <ScoreDistributionBarChart
                key={quiz.quiz_id}
                title={quiz.title}
                description={`Course: ${quiz.course_title} • Pass Rate: ${quiz.pass_rate.toFixed(1)}% • Avg Score: ${quiz.average_score.toFixed(1)}%`}
                distribution={quiz.score_distribution}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

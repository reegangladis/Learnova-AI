import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Search,
  ShieldCheck,
  TrendingUp,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { ActivityTrendChart } from "@/components/analytics/ActivityTrendChart";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { MetricCard } from "@/components/analytics/MetricCard";
import { UserRolePieChart } from "@/components/analytics/UserRolePieChart";
import { analyticsService } from "@/services/analyticsService";

export const AdminAnalyticsDashboard: React.FC = () => {
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "courses" | "enrollments">("overview");

  // User filters
  const [userRoleFilter, setUserRoleFilter] = useState<string>("");
  const [userSearch, setUserSearch] = useState<string>("");

  // Course filters
  const [courseStatusFilter, setCourseStatusFilter] = useState<string>("");
  const [courseSearch, setCourseSearch] = useState<string>("");

  // Enrollment filters
  const [enrollmentStatusFilter, setEnrollmentStatusFilter] = useState<string>("");

  // 1. Overview Query
  const {
    data: overview,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ["admin_analytics_overview", selectedDays],
    queryFn: () => analyticsService.getAdminOverview(undefined, selectedDays),
  });

  // 2. Users Query
  const {
    data: usersData,
    isLoading: isUsersLoading,
  } = useQuery({
    queryKey: ["admin_analytics_users", userRoleFilter, userSearch],
    queryFn: () =>
      analyticsService.getAdminUsers(
        undefined,
        userRoleFilter || undefined,
        userSearch || undefined,
        1,
        20
      ),
    enabled: activeTab === "users",
  });

  // 3. Courses Query
  const {
    data: coursesData,
    isLoading: isCoursesLoading,
  } = useQuery({
    queryKey: ["admin_analytics_courses", courseStatusFilter, courseSearch],
    queryFn: () =>
      analyticsService.getAdminCourses(
        undefined,
        courseStatusFilter || undefined,
        courseSearch || undefined,
        1,
        20
      ),
    enabled: activeTab === "courses",
  });

  // 4. Enrollments Query
  const {
    data: enrollmentsData,
    isLoading: isEnrollmentsLoading,
  } = useQuery({
    queryKey: ["admin_analytics_enrollments", enrollmentStatusFilter, selectedDays],
    queryFn: () =>
      analyticsService.getAdminEnrollments(
        undefined,
        enrollmentStatusFilter || undefined,
        undefined,
        selectedDays,
        1,
        20
      ),
    enabled: activeTab === "enrollments",
  });

  return (
    <div className="space-y-8 animate-fade-in" id="admin-analytics-dashboard">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Administrator Platform Analytics
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {overview?.organization_name
              ? `Organization: ${overview.organization_name} • Tenancy-scoped metrics and compliance audit logs`
              : "Platform-wide administrative telemetry, user demographics, and instructional analytics"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <DateRangeSelector value={selectedDays} onChange={setSelectedDays} />
          <Link to="/admin/users">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Users className="h-4 w-4" />
              <span>User Admin</span>
            </Button>
          </Link>
        </div>
      </div>

      {overviewError && (
        <Alert variant="destructive">
          Failed to load administrative analytics. Please verify your session permissions.
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

      {/* Overview Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          id="metric-admin-users"
          title="Total Users"
          value={overview?.total_users ?? 0}
          subtitle={`${overview?.active_users ?? 0} active • ${overview?.inactive_users ?? 0} inactive`}
          icon={Users}
          variant="primary"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-admin-courses"
          title="Courses in Scope"
          value={overview?.total_courses ?? 0}
          subtitle={`${overview?.published_courses ?? 0} published • ${overview?.draft_courses ?? 0} draft`}
          icon={BookOpen}
          variant="cyan"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-admin-enrollments"
          title="Total Enrollments"
          value={overview?.total_enrollments ?? 0}
          subtitle={`${overview?.active_enrollments ?? 0} active • ${overview?.completed_enrollments ?? 0} completed`}
          icon={TrendingUp}
          variant="purple"
          isLoading={isOverviewLoading}
        />

        <MetricCard
          id="metric-admin-completion-rate"
          title="Platform Completion Rate"
          value={`${overview?.overall_completion_rate?.toFixed(1) ?? "0.0"}%`}
          subtitle={`Pass Rate: ${overview?.quiz_pass_rate?.toFixed(1) ?? "0.0"}% across ${overview?.total_quiz_attempts ?? 0} quizzes`}
          icon={CheckCircle}
          variant="success"
          isLoading={isOverviewLoading}
        />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border space-x-1 sm:space-x-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "overview"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview & Visuals
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          User Demographics
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "courses"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Course Catalog Metrics
        </button>
        <button
          onClick={() => setActiveTab("enrollments")}
          className={`px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all ${
            activeTab === "enrollments"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Enrollment Telemetry
        </button>
      </div>

      {/* TAB 1: OVERVIEW & VISUAL TELEMETRY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityTrendChart
                title="Platform Growth & Activity Momentum"
                description={`Registrations, enrollments, and course completions over the last ${selectedDays} days`}
                data={overview?.trends || []}
                series={[
                  {
                    dataKey: "new_users",
                    name: "New Users",
                    stroke: "#3b82f6",
                    fill: "#3b82f6",
                  },
                  {
                    dataKey: "new_enrollments",
                    name: "Enrollments",
                    stroke: "#8b5cf6",
                    fill: "#8b5cf6",
                  },
                  {
                    dataKey: "completions",
                    name: "Completions",
                    stroke: "#10b981",
                    fill: "#10b981",
                  },
                ]}
              />
            </div>
            <div>
              <UserRolePieChart
                title="User Role Distribution"
                description="Active accounts grouped by assigned system role"
                roles={overview?.users_by_role || []}
              />
            </div>
          </div>

          {/* Real Audit Activity Stream */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Recent System & Security Audit Logs
              </CardTitle>
              <CardDescription className="text-xs">
                Real audit trail entries recorded across authentication, role assignments, and content events
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!overview?.recent_activity || overview.recent_activity.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
                  No security audit events recorded for this organization yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {overview.recent_activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">
                          {item.event_type}
                        </span>
                        <p className="text-muted-foreground text-[11px] mt-1">
                          User: {item.user_email || "System / Anonymous"}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground shrink-0">
                        {new Date(item.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2: USER DEMOGRAPHICS */}
      {activeTab === "users" && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">User Activity & Status Matrix</CardTitle>
              <CardDescription className="text-xs">
                Review registered accounts, role grants, and individual curriculum participation
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <select
                className="w-full sm:w-36 text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground"
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                aria-label="Filter users by role"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isUsersLoading ? (
              <div className="space-y-3 py-6">
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !usersData?.users || usersData.users.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No users match the specified search or role filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Courses Enrolled</TableHead>
                      <TableHead className="text-right">Courses Completed</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Last Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersData.users.map((u) => (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.roles.map((r) => (
                              <Badge key={r} variant="outline" className="text-[9px] px-1 py-0">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "success" : "destructive"} className="text-[10px]">
                            {u.is_active ? "Active" : "Suspended"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium">
                          {u.enrolled_courses_count}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {u.completed_courses_count}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: COURSE CATALOG METRICS */}
      {activeTab === "courses" && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Curriculum Performance Overview</CardTitle>
              <CardDescription className="text-xs">
                Inspect enrollment volumes and completion benchmarks across organization courses
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <select
                className="w-full sm:w-36 text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground"
                value={courseStatusFilter}
                onChange={(e) => setCourseStatusFilter(e.target.value)}
                aria-label="Filter courses by status"
              >
                <option value="">All Statuses</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
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
            </div>
          </CardHeader>
          <CardContent>
            {isCoursesLoading ? (
              <div className="space-y-3 py-6">
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !coursesData?.courses || coursesData.courses.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No courses found for the specified filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Instructor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Lessons</TableHead>
                      <TableHead className="text-right">Total Enrollments</TableHead>
                      <TableHead className="text-right">Completion Rate</TableHead>
                      <TableHead className="text-right">Avg Quiz Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coursesData.courses.map((c) => (
                      <TableRow key={c.course_id}>
                        <TableCell className="font-semibold text-foreground max-w-xs truncate">
                          {c.title}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {c.instructor_name}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              c.status === "published"
                                ? "success"
                                : c.status === "draft"
                                ? "warning"
                                : "outline"
                            }
                            className="capitalize text-[10px]"
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">{c.total_lessons}</TableCell>
                        <TableCell className="text-right font-medium text-xs">
                          {c.total_enrollments}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                          {c.completion_rate.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {c.average_quiz_score > 0 ? `${c.average_quiz_score.toFixed(1)}%` : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: ENROLLMENTS TELEMETRY */}
      {activeTab === "enrollments" && (
        <Card className="border-border/80">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
            <div>
              <CardTitle className="text-base font-semibold">Student Enrollment Logs</CardTitle>
              <CardDescription className="text-xs">
                Audit individual student enrollment statuses and completion dates
              </CardDescription>
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full text-xs h-9 px-3 rounded-md border border-input bg-background text-foreground"
                value={enrollmentStatusFilter}
                onChange={(e) => setEnrollmentStatusFilter(e.target.value)}
                aria-label="Filter enrollments by status"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {isEnrollmentsLoading ? (
              <div className="space-y-3 py-6">
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-8 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !enrollmentsData?.enrollments || enrollmentsData.enrollments.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
                No student enrollments match the selected status filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                      <TableHead>Enrolled At</TableHead>
                      <TableHead>Completed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollmentsData.enrollments.map((enr) => (
                      <TableRow key={enr.enrollment_id}>
                        <TableCell>
                          <div className="font-semibold text-foreground text-xs">{enr.user_name}</div>
                          <div className="text-[11px] text-muted-foreground">{enr.user_email}</div>
                        </TableCell>
                        <TableCell className="text-xs text-foreground font-medium max-w-xs truncate">
                          {enr.course_title}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              enr.status === "completed"
                                ? "success"
                                : enr.status === "active"
                                ? "default"
                                : "outline"
                            }
                            className="capitalize text-[10px]"
                          >
                            {enr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold text-primary">
                          {enr.progress_percentage.toFixed(0)}%
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(enr.enrolled_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {enr.completed_at ? new Date(enr.completed_at).toLocaleDateString() : "In Progress"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

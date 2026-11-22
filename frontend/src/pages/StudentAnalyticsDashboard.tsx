import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  Play,
  PlayCircle,
  Video,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService } from "@/services/analyticsService";

export const StudentAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<number>(30);

  // 1. Fetch student overview metrics
  const {
    data: overview,
  } = useQuery({
    queryKey: ["student_analytics_overview", selectedDays],
    queryFn: () => analyticsService.getStudentOverview(selectedDays),
  });

  // 2. Fetch student recent activity and trends
  const {
    data: activityData,
    isLoading: isActivityLoading,
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

  const studentName = user?.first_name || "Reegan";
  const activeResumeCourse = overview?.resume_courses && overview.resume_courses.length > 0 ? overview.resume_courses[0] : null;

  return (
    <div className="space-y-6" id="student-analytics-dashboard">
      {/* Header with Title and DateRangeSelector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-[#0B374D]" />
          <span>Student Learning Analytics</span>
        </h1>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={selectedDays} onChange={setSelectedDays} />
        </div>
      </div>

      {/* ROW 1: GREETING BANNER & SEMESTER PROGRESS CARDS (Matching Screenshot 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Dark Petrol Greeting Banner (7 cols) */}
        <div className="lg:col-span-7 bg-gradient-to-r from-[#0C3E56] via-[#093043] to-[#072433] text-white rounded-2xl p-6 sm:p-7 shadow-md border border-[#144E6D]/40 flex flex-col justify-between">
          <div className="space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              SATURDAY, 21 NOVEMBER 2026
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good evening, {studentName} 👋
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              You have <strong>2 deadlines</strong> this week and <strong>7 live classes</strong> coming up. Here's where to pick up.
            </p>
          </div>

          {/* UP NEXT Countdown Pill Card */}
          <div className="mt-5 p-4 rounded-xl bg-[#051C28]/85 border border-[#16506D]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3 bg-amber-500 rounded-xs" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">
                  UP NEXT
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                FEEDBACK-International Business-July-26-(Week-07)
              </h4>
              <p className="text-[11px] text-slate-400">
                26VMC0C101 · 21 Nov, 23:00
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[10px] font-mono font-bold bg-[#0D384D] px-2.5 py-1 rounded-md text-slate-200 border border-[#185370]">
                00:41:32 REMAINING
              </span>
              <button
                type="button"
                onClick={() => navigate("/my-courses")}
                className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-3.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Open</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/my-courses")}
              className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Resume last activity</span>
            </button>
            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-lg text-xs border border-white/15 flex items-center gap-2 transition-all"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Join next class</span>
            </button>
          </div>
        </div>

        {/* Right Card: Semester Progress Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header: Title and Streak */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Semester progress · Semester 1 · current
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[11px] font-bold border border-amber-200">
                <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>4-day streak</span>
              </div>
            </div>

            {/* Circular Progress & Breakdown */}
            <div className="flex items-center justify-between gap-6 py-4">
              {/* Radial Donut progress ring */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-sky-500 transition-all duration-1000 ease-out"
                    strokeDasharray="32, 100"
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-extrabold text-slate-900 leading-none">32%</span>
                  <span className="text-[7px] uppercase font-bold text-slate-400 mt-0.5">AVG. COMPLETE</span>
                </div>
              </div>

              {/* Legend & Status numbers */}
              <div className="space-y-1.5 flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Completed
                  </span>
                  <span className="font-bold text-slate-900">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    In progress
                  </span>
                  <span className="font-bold text-slate-900">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    Not started
                  </span>
                  <span className="font-bold text-slate-900">3</span>
                </div>
              </div>
            </div>

            {/* Weekly Activity mini bar chart */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                <span>THIS WEEK</span>
                <span>ACTIVITY</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 items-end h-9 px-1">
                <div className="bg-slate-100 rounded-xs h-2 w-full" title="Mon" />
                <div className="bg-sky-400 rounded-xs h-5 w-full" title="Tue" />
                <div className="bg-sky-500 rounded-xs h-8 w-full" title="Wed" />
                <div className="bg-sky-600 rounded-xs h-9 w-full" title="Thu" />
                <div className="bg-sky-400 rounded-xs h-4 w-full" title="Fri" />
                <div className="bg-sky-500 rounded-xs h-6 w-full" title="Sat" />
                <div className="bg-slate-100 rounded-xs h-2 w-full" title="Sun" />
              </div>
            </div>
          </div>

          {/* Focus next bar */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
                <Play className="w-3 h-3 fill-white" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] uppercase font-bold text-slate-400 block">FOCUS NEXT</span>
                <p className="text-xs font-bold text-slate-800 truncate">
                  1.4 Mathematical Foundation for Computer...
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate("/my-courses")}
              className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-3 py-1 rounded-md text-xs shrink-0"
            >
              Start →
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2: 4 QUICK METRIC STAT CARDS (Screenshot 4 layout + Live Analytics Integration) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Courses / Enrolled Courses */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-extrabold text-slate-900">
                {overview?.total_enrolled_courses ?? 8}
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded-sm">
                Semester 1
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Enrolled Courses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Curriculum Progress */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-slate-900">
              {overview?.overall_learning_progress ? `${overview.overall_learning_progress.toFixed(1)}%` : "32%"}
            </span>
            <p className="text-xs text-slate-500 font-medium">Curriculum Progress</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Quiz Pass Rate */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-rose-600">
              {overview?.quiz_pass_rate ? `${overview.quiz_pass_rate.toFixed(1)}%` : "80.0%"}
            </span>
            <p className="text-xs text-slate-500 font-medium">Quiz Pass Rate</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Average Quiz Score */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-2xl font-extrabold text-purple-600">
              {overview?.average_quiz_score ? `${overview.average_quiz_score.toFixed(1)}%` : "84.0%"}
            </span>
            <p className="text-xs text-slate-500 font-medium">Average Quiz Score</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* RESUME LEARNING ACTION CARD (If active courses to resume exist) */}
      {activeResumeCourse && (
        <Card className="border-border/80 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Resume Learning
            </CardTitle>
            <CardDescription className="text-xs">
              Pick up where you left off in your enrolled courses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-border shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">
                  Next up in enrolled curriculum
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900">
                  {activeResumeCourse.course_title}
                </h4>
                <p className="text-xs text-slate-500">
                  Next: {activeResumeCourse.next_lesson_title} • {activeResumeCourse.completed_lessons} of {activeResumeCourse.total_lessons} lessons completed
                </p>
              </div>
              <Link to={`/learning/courses/${activeResumeCourse.course_id}`}>
                <Button
                  size="sm"
                  className="gap-2 bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Continue Course</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROW 3: COMPREHENSIVE SAMPLE COURSES (Modules, Video, PPT, Self-Assessments, Quizzes) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Featured Sample Courses &amp; Curricula
            </h3>
            <p className="text-xs text-slate-500">Each course includes modular learning, lecture videos, PPT presentation slides, and self-assessments.</p>
          </div>
          <Link
            to="/my-courses"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Explore all courses →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              id: "cloud-devops",
              title: "Full-Stack Cloud & DevOps Engineering",
              category: "Cloud & DevOps",
              gradient: "from-blue-600 to-cyan-600",
              modules: 2,
              duration: "320 mins",
              hasPpt: true,
              hasSelfAssessment: true,
              hasQuiz: true,
            },
            {
              id: "ai-llms",
              title: "Enterprise AI Engineering & Large Language Models",
              category: "AI & Data Science",
              gradient: "from-indigo-600 to-violet-600",
              modules: 2,
              duration: "380 mins",
              hasPpt: true,
              hasSelfAssessment: true,
              hasQuiz: true,
            },
            {
              id: "python-spark",
              title: "Advanced Python & Distributed Data Systems",
              category: "Software Engineering",
              gradient: "from-emerald-600 to-teal-600",
              modules: 2,
              duration: "340 mins",
              hasPpt: true,
              hasSelfAssessment: true,
              hasQuiz: true,
            },
            {
              id: "cybersecurity-zt",
              title: "Enterprise Cybersecurity & Zero Trust Systems",
              category: "Cybersecurity",
              gradient: "from-slate-800 to-slate-950",
              modules: 2,
              duration: "290 mins",
              hasPpt: true,
              hasSelfAssessment: true,
              hasQuiz: true,
            },
          ].map((course) => (
            <div
              key={course.id}
              onClick={() => navigate("/my-courses")}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between overflow-hidden group"
            >
              <div>
                <div className={`h-20 bg-gradient-to-r ${course.gradient} p-3.5 text-white flex flex-col justify-between`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded-full">
                      {course.category}
                    </span>
                    <span className="text-[10px] text-white/80 font-mono font-medium">{course.duration}</span>
                  </div>
                  <span className="text-xs font-semibold text-white/90">2 Comprehensive Modules</span>
                </div>

                <div className="p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                    {course.title}
                  </h4>

                  <div className="flex flex-wrap gap-1 text-[9px] font-semibold">
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">PPT Included</span>
                    <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">Self-Assessment</span>
                    <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">Graded Quiz</span>
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  type="button"
                  className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>Start Course</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 4: RECENT ACTIVITY & QUIZ RESULTS (Test & Diagnostic Completeness) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Recent Activity Stream */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Recent Activity Stream
            </CardTitle>
            <CardDescription className="text-xs">
              Chronological study actions and milestone events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isActivityLoading ? (
              <div className="space-y-3 py-4">
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
                <div className="h-10 bg-muted/60 animate-pulse rounded-md" />
              </div>
            ) : !activityData?.recent_activities || activityData.recent_activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No recent activity recorded yet. Start a lesson to build your momentum!
              </div>
            ) : (
              <div className="space-y-3">
                {activityData.recent_activities.slice(0, 5).map((item) => (
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
              </div>
            ) : !assessmentsData?.results || assessmentsData.results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-lg">
                No finalized quiz attempts recorded yet. Take a quiz to test your knowledge!
              </div>
            ) : (
              <div className="space-y-3">
                {assessmentsData.results.slice(0, 5).map((res) => (
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

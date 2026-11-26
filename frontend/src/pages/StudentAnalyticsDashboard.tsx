import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Award,
  BookOpen,
  Bot,
  Calendar,
  Clock,
  Flame,
  GraduationCap,
  Layers,
  Play,
  PlayCircle,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { DateRangeSelector } from "@/components/analytics/DateRangeSelector";
import { useAuth } from "@/hooks/useAuth";
import { analyticsService } from "@/services/analyticsService";
import { CourseRecommendationsCard } from "@/components/ml/CourseRecommendationsCard";
import { LearningPathCard } from "@/components/ml/LearningPathCard";
import { LearningInsightsCard } from "@/components/ml/LearningInsightsCard";
import { SEEDED_COURSES } from "@/data/courseCurricula";

const WEEKLY_STUDY_DATA = [
  { day: "Mon", minutes: 35, lessons: 1 },
  { day: "Tue", minutes: 55, lessons: 2 },
  { day: "Wed", minutes: 80, lessons: 3 },
  { day: "Thu", minutes: 95, lessons: 3 },
  { day: "Fri", minutes: 45, lessons: 1 },
  { day: "Sat", minutes: 70, lessons: 2 },
  { day: "Sun", minutes: 50, lessons: 2 },
];

export const StudentAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [focusMode, setFocusMode] = useState<"deep_work" | "exam_prep">("deep_work");
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(60);
  const [activeDayIdx, setActiveDayIdx] = useState<number>(3);
  const [curriculumFilter, setCurriculumFilter] = useState<"all" | "intermediate" | "advanced">("all");

  const { data: overview } = useQuery({
    queryKey: ["student_analytics_overview", selectedDays],
    queryFn: () => analyticsService.getStudentOverview(selectedDays),
  });

  const { data: activityData, isLoading: isActivityLoading } = useQuery({
    queryKey: ["student_analytics_activity", selectedDays],
    queryFn: () => analyticsService.getStudentActivity(selectedDays, 15),
  });

  const { data: assessmentsData, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["student_analytics_assessments"],
    queryFn: () => analyticsService.getStudentAssessments(undefined, 1, 10),
  });

  const studentName = user?.first_name || "Alex";
  const activeResumeCourse =
    overview?.resume_courses && overview.resume_courses.length > 0
      ? overview.resume_courses[0]
      : null;

  const progressPct = overview?.overall_learning_progress ?? 0;
  const activeDay = WEEKLY_STUDY_DATA[activeDayIdx];
  const goalProgressPct = Math.min(
    100,
    Math.round((activeDay.minutes / dailyGoalMinutes) * 100)
  );

  const filteredCurricula = useMemo(() => {
    if (curriculumFilter === "all") return SEEDED_COURSES;
    return SEEDED_COURSES.filter((c) => c.difficulty === curriculumFilter);
  }, [curriculumFilter]);

  return (
    <div className="space-y-7" id="student-analytics-dashboard">
      {/* Studio Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-teal-700 dark:text-teal-400 font-semibold">
            Learnova Atelier · Personal Telemetry
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5 mt-0.5">
            <GraduationCap className="h-6 w-6 text-teal-600" />
            <span>Student Learning Analytics</span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Interactive Study Mode Switch */}
          <div className="inline-flex p-1 rounded-xl bg-secondary border border-border text-xs">
            <button
              type="button"
              onClick={() => setFocusMode("deep_work")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                focusMode === "deep_work"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Deep Studio
            </button>
            <button
              type="button"
              onClick={() => setFocusMode("exam_prep")}
              className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                focusMode === "exam_prep"
                  ? "bg-orange-500 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Exam Sprint
            </button>
          </div>
          <DateRangeSelector value={selectedDays} onChange={setSelectedDays} />
        </div>
      </div>

      {/* ROW 1: KINETIC STUDIO BENTO (8 + 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Editorial Cockpit Panel (8 cols) */}
        <div className="lg:col-span-7 studio-card p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 relative z-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[11px] font-mono font-semibold text-teal-700 dark:text-teal-300">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                {focusMode === "deep_work"
                  ? "MODE: CONCEPT MASTERY & LABS"
                  : "MODE: TIMED ASSESSMENT READINESS"}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                Window: Last {selectedDays} Days
              </span>
            </div>

            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Welcome back, {studentName}
            </h2>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              {focusMode === "deep_work"
                ? `You have completed ${overview?.completed_lessons_count ?? 0} lessons across ${overview?.total_enrolled_courses ?? 0} active tracks. Keep momentum steady with interactive slide decks and grounded AI tutoring.`
                : `Your current quiz pass rate sits at ${(overview?.quiz_pass_rate ?? 0).toFixed(1)}% with an average score of ${(overview?.average_quiz_score ?? 0).toFixed(1)}%. Launch a timed assessment or review weak concepts with FAISS Copilot.`}
            </p>
          </div>

          {/* Interactive Goal Calibrator & Spotlight */}
          <div className="mt-6 p-4 rounded-xl bg-secondary/50 border border-border space-y-3 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-foreground">
                  Daily Focus Target: {dailyGoalMinutes} mins/day
                </span>
              </div>
              <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400">
                {activeDay.day} Hit {goalProgressPct}% of Target
              </span>
            </div>
            <input
              type="range"
              min={30}
              max={120}
              step={15}
              value={dailyGoalMinutes}
              onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
              aria-label="Daily Study Target Minutes"
              className="w-full accent-teal-600 cursor-pointer"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
              <span>30m Light</span>
              <span>60m Balanced</span>
              <span>90m Intensive</span>
              <span>120m Deep Sprint</span>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-5 flex flex-wrap items-center gap-3 relative z-10">
            <button
              type="button"
              onClick={() => navigate("/my-courses")}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-[0_2px_0_0_#0f766e] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>My Course Studio</span>
            </button>

            <button
              type="button"
              onClick={() => navigate("/calendar")}
              className="bg-card hover:bg-secondary text-foreground font-semibold px-4 py-2.5 rounded-xl text-xs border border-border flex items-center gap-2 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Study Schedule</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
              className="bg-card hover:bg-secondary text-foreground font-semibold px-4 py-2.5 rounded-xl text-xs border border-border flex items-center gap-2 transition-all cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-teal-600" />
              <span>Ask Study Copilot</span>
            </button>
          </div>
        </div>

        {/* Right: Interactive Velocity & Progress Ring (5 cols) */}
        <div className="lg:col-span-5 studio-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-display text-sm font-bold text-foreground">
                Velocity &amp; Mastery Gauge
              </h3>
              <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full text-[11px] font-bold border border-orange-500/20">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>4-day streak</span>
              </div>
            </div>

            {/* Radial Gauge + Live Counts */}
            <div className="flex items-center justify-between gap-6 py-4">
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-secondary"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-teal-600 transition-all duration-700 ease-out"
                    strokeDasharray={`${Math.min(100, Math.max(0, progressPct))}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="font-display text-lg font-bold text-foreground leading-none">
                    {progressPct.toFixed(0)}%
                  </span>
                  <span className="text-[8px] font-mono uppercase text-muted-foreground mt-0.5">
                    COMPLETE
                  </span>
                </div>
              </div>

              <div className="space-y-2 flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Completed Tracks
                  </span>
                  <span className="font-bold text-foreground">
                    {overview?.courses_completed ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    Active In Progress
                  </span>
                  <span className="font-bold text-foreground">
                    {overview?.courses_in_progress ?? 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Remaining Lessons
                  </span>
                  <span className="font-bold text-foreground">
                    {overview?.remaining_lessons_count ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Weekly Cadence Bars (Click a day to inspect!) */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground mb-2">
                <span>WEEKLY CADENCE (CLICK DAY)</span>
                <span className="text-foreground font-semibold">
                  {activeDay.day}: {activeDay.minutes}m · {activeDay.lessons} lessons
                </span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 items-end h-14 px-1">
                {WEEKLY_STUDY_DATA.map((d, idx) => {
                  const isSelected = idx === activeDayIdx;
                  const heightPct = Math.max(20, Math.round((d.minutes / 100) * 100));
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => setActiveDayIdx(idx)}
                      className="flex flex-col items-center justify-end h-full gap-1 group cursor-pointer"
                      title={`${d.day}: ${d.minutes} mins`}
                    >
                      <div
                        className={`w-full rounded-md transition-all ${
                          isSelected
                            ? "bg-orange-500 shadow-xs"
                            : "bg-teal-500/35 group-hover:bg-teal-500/65"
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      <span
                        className={`text-[9px] font-mono ${
                          isSelected ? "font-bold text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {d.day[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Explore full syllabus catalog</span>
            <Link
              to="/courses"
              className="font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ROW 2: 4 KPI TELEMETRY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="studio-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-display text-2xl font-bold text-foreground block">
              {overview?.total_enrolled_courses ?? 0}
            </span>
            <p className="text-xs text-muted-foreground font-medium">Enrolled Courses</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-700 dark:text-teal-300 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="studio-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-display text-2xl font-bold text-foreground block">
              {`${(overview?.overall_learning_progress ?? 0).toFixed(1)}%`}
            </span>
            <p className="text-xs text-muted-foreground font-medium">Curriculum Progress</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="studio-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-display text-2xl font-bold text-orange-600 dark:text-orange-400 block">
              {`${(overview?.quiz_pass_rate ?? 0).toFixed(1)}%`}
            </span>
            <p className="text-xs text-muted-foreground font-medium">Quiz Pass Rate</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="studio-card p-5 flex items-center justify-between">
          <div className="space-y-1">
            <span className="font-display text-2xl font-bold text-blue-600 dark:text-blue-400 block">
              {`${(overview?.average_quiz_score ?? 0).toFixed(1)}%`}
            </span>
            <p className="text-xs text-muted-foreground font-medium">Average Quiz Score</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* RESUME LEARNING ACTION CARD */}
      {activeResumeCourse && (
        <Card className="border-teal-500/30 bg-teal-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-bold flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-teal-600" />
              Resume Learning
            </CardTitle>
            <CardDescription className="text-xs">
              Pick up where you left off in your enrolled curriculum
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400 block">
                  Next up in enrolled curriculum
                </span>
                <h4 className="font-display text-sm sm:text-base font-bold text-foreground">
                  {activeResumeCourse.course_title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Next: {activeResumeCourse.next_lesson_title} · {activeResumeCourse.completed_lessons} of{" "}
                  {activeResumeCourse.total_lessons} lessons completed
                </p>
              </div>
              <Link to={`/learning/courses/${activeResumeCourse.course_id}`}>
                <Button
                  size="sm"
                  className="gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-[0_2px_0_0_#0f766e]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Continue Course</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI & ML INTELLIGENCE HUB */}
      <div className="space-y-5 pt-1">
        <div className="p-5 sm:p-6 rounded-2xl bg-foreground text-background border border-border shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 text-teal-300">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-teal-300">
                AI &amp; Machine Learning Intelligence Hub
              </span>
              <span className="text-[10px] font-mono font-bold bg-background/10 px-2.5 py-0.5 rounded-full border border-background/20">
                FAISS Vector Store · 1,240 Chunks Indexed
              </span>
            </div>
            <h3 className="font-display text-lg font-bold">
              AI Study Copilot &amp; Personalized Learning Paths
            </h3>
            <p className="text-xs opacity-80 max-w-2xl leading-relaxed">
              Query indexed course slide decks with LangChain RAG &amp; source citations, backed by
              ML mastery models recommending your next skill milestone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
            className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0 kinetic-press"
          >
            <Bot className="w-4 h-4" />
            <span>Launch AI Copilot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LearningPathCard />
          <LearningInsightsCard />
        </div>

        <CourseRecommendationsCard limit={3} />
      </div>

      {/* CURRICULA SHOWCASE MATRIX WITH INTERACTIVE FILTER */}
      <div className="space-y-4 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Interactive Curricula Tracks
            </h3>
            <p className="text-xs text-muted-foreground">
              Every track includes slide decks, lecture videos, flashcards, and graded assessments.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(["all", "intermediate", "advanced"] as const).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setCurriculumFilter(lvl)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  curriculumFilter === lvl
                    ? "bg-foreground text-background"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {lvl === "all" ? "All Levels" : lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCurricula.map((course, idx) => {
            const accents = [
              "border-t-4 border-t-teal-600",
              "border-t-4 border-t-orange-500",
              "border-t-4 border-t-blue-600",
              "border-t-4 border-t-emerald-600",
            ];
            return (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className={`studio-card ${accents[idx % accents.length]} p-5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-secondary text-foreground font-semibold">
                      {course.category?.name}
                    </span>
                    <span className="text-muted-foreground">{course.duration_minutes}m</span>
                  </div>
                  <h4 className="font-display text-sm font-bold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors line-clamp-2">
                    {course.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {course.short_description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-teal-600" />
                    {course.modules_count} Modules
                  </span>
                  <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ROW 4: RECENT ACTIVITY & QUIZ RESULTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
        <Card className="studio-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-teal-600" />
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
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No recent activity recorded yet. Start a lesson to build your momentum!
              </div>
            ) : (
              <div className="space-y-2.5">
                {activityData.recent_activities.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/40 border border-border text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{item.title}</p>
                      <p className="text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                      {new Date(item.timestamp).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="studio-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-orange-500" />
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
              <div className="text-center py-8 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                No finalized quiz attempts recorded yet. Take a quiz to test your knowledge!
              </div>
            ) : (
              <div className="space-y-2.5">
                {assessmentsData.results.slice(0, 5).map((res) => (
                  <div
                    key={res.attempt_id}
                    className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-foreground truncate">{res.quiz_title}</p>
                      <p className="text-muted-foreground text-[11px] truncate">
                        {res.course_title} · Attempt #{res.attempt_number}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono font-bold text-foreground">
                        {res.percentage_score.toFixed(1)}%
                      </span>
                      <Badge
                        variant={res.passed ? "success" : "destructive"}
                        className="text-[10px]"
                      >
                        {res.passed ? "Passed" : "Failed"}
                      </Badge>
                      <Link
                        to={`/learning/quizzes/${res.quiz_id}/results/${res.attempt_id}`}
                        className="text-teal-700 dark:text-teal-400 hover:underline font-bold text-xs"
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  LayoutGrid,
  List,
  Search,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { learningService } from "@/services/learningService";

const STARRED_STORAGE_KEY = "learnova_starred_courses_v1";

export function MyLearningPage() {
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "past" | "starred">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STARRED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STARRED_STORAGE_KEY, JSON.stringify(starredIds));
    } catch {
      // Ignore storage error
    }
  }, [starredIds]);

  const toggleStar = (courseId: string) => {
    setStarredIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const {
    data: enrollmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => learningService.listMyEnrollments(),
  });

  const enrollments = enrollmentsData?.items || [];

  // Derived real metrics (replacing static mock counters)
  const totalEnrolled = enrollments.length;
  const completedCount = enrollments.filter(
    (e) => e.status === "completed" || (e.progress_percentage || 0) >= 100
  ).length;
  const inProgressCount = Math.max(0, totalEnrolled - completedCount);
  const avgProgress =
    totalEnrolled > 0
      ? Math.round(
          enrollments.reduce((acc, e) => acc + (e.progress_percentage || 0), 0) / totalEnrolled
        )
      : 0;

  const filteredEnrollments = enrollments.filter((e) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      e.course?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.course?.short_description?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === "in_progress") {
      return e.status === "active" && (e.progress_percentage || 0) < 100;
    }
    if (activeTab === "past") {
      return e.status === "completed" || (e.progress_percentage || 0) >= 100;
    }
    if (activeTab === "starred") {
      return starredIds.includes(e.course_id);
    }
    return true;
  });

  const continueCourse =
    enrollments.find((e) => (e.progress_percentage || 0) < 100) || enrollments[0];

  const getMonogram = (title: string) => {
    const words = title.split(" ").filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  };

  const getAccentBorder = (idx: number) => {
    const borders = [
      "border-l-4 border-l-teal-600",
      "border-l-4 border-l-orange-500",
      "border-l-4 border-l-blue-600",
      "border-l-4 border-l-emerald-600",
    ];
    return borders[idx % borders.length];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Studio My Learning Header Deck */}
      <div className="studio-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 border border-teal-500/20 px-2.5 py-0.5 rounded-full">
            My Learning
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My courses
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Resume modules, star priority tracks, and monitor lesson completion across curricula.
          </p>
        </div>

        {/* Dynamic Live Counters */}
        <div className="grid grid-cols-4 gap-3 sm:gap-5 bg-secondary/50 p-3.5 sm:px-5 rounded-2xl border border-border shrink-0">
          <div className="text-center">
            <span className="font-display text-xl sm:text-2xl font-bold text-foreground block leading-none">
              {totalEnrolled}
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              ENROLLED
            </span>
          </div>
          <div className="text-center border-l border-border pl-3 sm:pl-5">
            <span className="font-display text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 block leading-none">
              {inProgressCount}
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              ACTIVE
            </span>
          </div>
          <div className="text-center border-l border-border pl-3 sm:pl-5">
            <span className="font-display text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 block leading-none">
              {completedCount}
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              DONE
            </span>
          </div>
          <div className="text-center border-l border-border pl-3 sm:pl-5">
            <span className="font-display text-xl sm:text-2xl font-bold text-teal-700 dark:text-teal-400 block leading-none">
              avg {avgProgress}%
            </span>
            <span className="text-[9px] font-mono uppercase text-muted-foreground mt-1 block">
              AVG RATE
            </span>
          </div>
        </div>
      </div>

      {/* CONTINUE LEARNING SPOTLIGHT */}
      {continueCourse && (
        <div className="studio-card p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-teal-500/30 bg-teal-500/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white font-display font-bold text-lg flex items-center justify-center shadow-[0_3px_0_0_#0f766e] shrink-0">
              {getMonogram(continueCourse.course?.title || "LN")}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400 block">
                CONTINUE LEARNING
              </span>
              <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-snug">
                Current Focus: {continueCourse.course?.title}
              </h3>
              <div className="flex items-center gap-3 pt-1">
                <div className="w-44 sm:w-64 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all"
                    style={{ width: `${continueCourse.progress_percentage || 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-foreground">
                  {Math.round(continueCourse.progress_percentage || 0)}% Completed
                </span>
              </div>
            </div>
          </div>

          <Link to={`/learning/courses/${continueCourse.course_id}`}>
            <button
              type="button"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm shadow-[0_3px_0_0_#0f766e] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Resume Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* FILTER, SEARCH & VIEW TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-xs font-bold text-foreground whitespace-nowrap">
            {filteredEnrollments.length} {filteredEnrollments.length === 1 ? "Course" : "Courses"}
          </span>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search my courses..."
              className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(["all", "in_progress", "past", "starred"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === tab
                    ? "bg-foreground text-background"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "all"
                  ? "All"
                  : tab === "in_progress"
                  ? "In progress"
                  : tab === "past"
                  ? "Completed"
                  : `★ Starred (${starredIds.length})`}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center p-1 bg-card border border-border rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg cursor-pointer ${
                viewMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              aria-label="List View"
              className={`p-1.5 rounded-lg cursor-pointer ${
                viewMode === "list" ? "bg-secondary text-foreground" : "text-muted-foreground"
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load your enrolled courses: {(error as Error)?.message || "Network error"}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="studio-card p-5 space-y-3">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredEnrollments.length === 0 && (
        <div className="studio-card p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-secondary text-teal-600 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">
              {activeTab === "starred" ? "No Starred Courses" : "No Enrolled Courses Yet"}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {activeTab === "starred"
                ? "Click the star icon on any course card to pin it here for instant access."
                : "You haven't enrolled in any learning tracks yet. Explore our course catalog to start learning."}
            </p>
          </div>
          {activeTab !== "starred" && (
            <Link to="/courses">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5">
                <span>Explore Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* ENROLLED COURSES */}
      {!isLoading && filteredEnrollments.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
              : "flex flex-col gap-3"
          }
        >
          {filteredEnrollments.map((enr, idx) => {
            const progress = enr.progress_percentage || 0;
            const isDone = progress >= 100;
            const completedLessons = enr.completed_lessons_count || 0;
            const totalLessons = enr.total_lessons_count || enr.course?.lessons_count || 1;
            const isStarred = starredIds.includes(enr.course_id);

            return (
              <div
                key={enr.id}
                className={`studio-card ${getAccentBorder(idx)} p-5 hover:shadow-md transition-all flex ${
                  viewMode === "grid"
                    ? "flex-col justify-between gap-4"
                    : "flex-col sm:flex-row sm:items-center justify-between gap-4"
                }`}
              >
                <div className="space-y-2.5 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-secondary text-foreground font-mono font-bold text-xs flex items-center justify-center">
                        {getMonogram(enr.course?.title || "CO")}
                      </span>
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                        {enr.course?.difficulty || "Comprehensive"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleStar(enr.course_id)}
                      title={isStarred ? "Unstar course" : "Star course"}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isStarred
                          ? "text-orange-500 bg-orange-500/10"
                          : "text-muted-foreground hover:text-orange-500 hover:bg-secondary"
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
                    </button>
                  </div>

                  <Link to={`/courses/${enr.course_id}`}>
                    <h4 className="font-display text-base font-bold text-foreground hover:text-teal-700 dark:hover:text-teal-400 transition-colors leading-snug">
                      {enr.course?.title}
                    </h4>
                  </Link>
                  {enr.course?.short_description && viewMode === "grid" && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {enr.course.short_description}
                    </p>
                  )}
                </div>

                <div className={viewMode === "list" ? "w-full sm:w-64 space-y-2" : "space-y-3"}>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {completedLessons} of {totalLessons} lessons
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDone ? "bg-emerald-500" : "bg-teal-600"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-border">
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {isDone ? "Completed" : "In progress"}
                    </span>
                    <Link to={`/courses/${enr.course_id}`}>
                      <button
                        type="button"
                        className="bg-foreground hover:bg-foreground/90 text-background font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>{isDone ? "Review" : progress > 0 ? "Continue" : "Open Course"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

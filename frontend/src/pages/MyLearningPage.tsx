import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Star,
  MoreVertical,
  Search,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { learningService } from "@/services/learningService";

export function MyLearningPage() {
  const [activeTab, setActiveTab] = useState<"all" | "in_progress" | "future" | "past" | "starred">("all");
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter enrollments based on active tab and search
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
    return true;
  });

  // Highlight first in-progress course for "Continue Learning" banner (Screenshot 5)
  const continueCourse = enrollments.find((e) => (e.progress_percentage || 0) < 100) || enrollments[0];

  const getMonogram = (title: string) => {
    const words = title.split(" ").filter(Boolean);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.slice(0, 2).toUpperCase();
  };

  const getCardColor = (idx: number) => {
    const colors = [
      "from-blue-600 to-indigo-700",
      "from-sky-500 to-blue-600",
      "from-teal-600 to-cyan-700",
      "from-purple-600 to-indigo-800",
      "from-indigo-600 to-blue-800",
      "from-slate-700 to-slate-900",
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* TOP HERO BANNER: Deep Petrol Blue with Stat Counters (Screenshot 5) */}
      <div className="bg-gradient-to-r from-[#0C3E56] via-[#093043] to-[#072433] rounded-2xl p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-sm">
              My Learning
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My courses
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Pick up where you left off and keep making progress.
            </p>
          </div>

          {/* Quick Stat Counters (Screenshot 5: 24 Enrolled, 11 This Semester, 5 In Progress, 2 Completed) */}
          <div className="flex items-center gap-3 sm:gap-6 bg-[#051C28]/80 p-3 sm:p-4 rounded-xl border border-[#16506D]/60 shrink-0">
            <div className="text-center px-2">
              <span className="text-xl sm:text-2xl font-extrabold text-white block leading-none">
                {enrollments.length > 0 ? enrollments.length : 24}
              </span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">ENROLLED</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-center px-2">
              <span className="text-xl sm:text-2xl font-extrabold text-sky-400 block leading-none">11</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">THIS SEMESTER</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-center px-2">
              <span className="text-xl sm:text-2xl font-extrabold text-amber-400 block leading-none">5</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">IN PROGRESS</span>
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="text-center px-2">
              <span className="text-xl sm:text-2xl font-extrabold text-emerald-400 block leading-none">2</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 block">COMPLETED</span>
            </div>
          </div>
        </div>
      </div>

      {/* HIGHLIGHT CARD: CONTINUE LEARNING (Screenshot 5) */}
      {continueCourse && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shrink-0">
              {getMonogram(continueCourse.course?.title || "IB")}
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-600 block">
                CONTINUE LEARNING
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Current Focus: {continueCourse.course?.title}
              </h3>
              <p className="text-xs text-slate-500">
                DSM July, 2026 · Instructor
              </p>
              {/* Progress bar */}
              <div className="flex items-center gap-3 pt-1">
                <div className="w-48 sm:w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${continueCourse.progress_percentage || 50}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {continueCourse.progress_percentage || 50}% Completed
                </span>
              </div>
            </div>
          </div>

          <Link to={`/learning/courses/${continueCourse.course_id}`}>
            <button
              type="button"
              className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Resume Learning</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR (Screenshot 5) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Course count and search */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
            {filteredEnrollments.length} My Courses
          </span>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search my courses..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0B374D]"
            />
          </div>
        </div>

        {/* Filter Pills (All, In progress, Future, Past, Starred) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "in_progress", "future", "past", "starred"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "bg-[#0B374D] text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab === "all"
                ? "All"
                : tab === "in_progress"
                ? "In progress"
                : tab === "future"
                ? "Future"
                : tab === "past"
                ? "Past"
                : "★ Starred"}
            </button>
          ))}
        </div>
      </div>

      {/* ERROR STATE */}
      {isError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Failed to load your enrolled courses: {(error as Error)?.message || "Network error"}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* LOADING STATE */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredEnrollments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">No Enrolled Courses Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven&apos;t enrolled in any learning tracks yet. Explore our course catalog to start learning.
            </p>
          </div>
          <Link to="/courses">
            <Button className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs gap-1.5">
              <span>Explore Catalog</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* GROUPED ACCORDION: Semester - 01 (Screenshot 5) */}
      {!isLoading && filteredEnrollments.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Semester - 01
              </span>
              <span className="text-[11px] text-slate-400 font-medium">avg 41%</span>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              {filteredEnrollments.length} {filteredEnrollments.length === 1 ? "course" : "courses"}
            </span>
          </div>

          {/* COURSE CARDS GRID (Screenshot 2 & 5) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEnrollments.map((enr, idx) => {
              const progress = enr.progress_percentage || 0;
              const isDone = progress >= 100;
              const completedLessons = enr.completed_lessons_count || 0;
              const totalLessons = enr.total_lessons_count || enr.course?.lessons_count || 1;

              return (
                <div
                  key={enr.id}
                  className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  {/* Top Colored Header Banner with Monogram & Actions (Screenshot 5) */}
                  <div className={`h-24 bg-gradient-to-r ${getCardColor(idx)} p-3 text-white flex items-start justify-between relative`}>
                    <span className="text-xl font-extrabold tracking-tight drop-shadow-sm">
                      {getMonogram(enr.course?.title || "CO")}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" title="Star course" className="text-white/70 hover:text-amber-300 transition-colors">
                        <Star className="w-4 h-4" />
                      </button>
                      <button type="button" title="Options" className="text-white/70 hover:text-white transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[8px]">
                          IN
                        </div>
                        <span className="truncate">DSM July, 2026 · Instructor</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-[#0B374D] transition-colors line-clamp-2 leading-snug">
                        {enr.course?.title}
                      </h4>
                    </div>

                    {/* Progress Bar & Percentage */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500">
                          {completedLessons} of {totalLessons} lessons
                        </span>
                        <span className="font-bold text-slate-800">
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDone ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Footer Row & Action Button */}
                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <span className="text-[10px] text-slate-400">
                        {isDone ? "Completed" : "In progress"}
                      </span>

                      <Link to={`/learning/courses/${enr.course_id}`}>
                        <button
                          type="button"
                          className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-3 py-1.5 rounded-md text-xs flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                        >
                          <span>{isDone ? "Review" : progress > 0 ? "Continue" : "Start"}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

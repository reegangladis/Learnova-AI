import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  ListOrdered,
  FileText,
  Video,
  Presentation,
  ExternalLink,
  Edit,
  Layers,
  Eye,
  AlertCircle,
  X,
  GraduationCap,
  PlayCircle,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  MessageSquare,
  Sparkles,
  Send,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { learningService } from "@/services/learningService";
import { quizService } from "@/services/quizService";
import { useAuth } from "@/hooks/useAuth";
import { Lesson } from "@/types/course";
import { LearningCourse } from "@/types/learning";
import { StudentCourseQuizItem } from "@/types/quiz";

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();

  const [activeTab, setActiveTab] = useState<"course" | "grades" | "overview">("course");
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});
  const [selectedPreviewLesson, setSelectedPreviewLesson] = useState<Lesson | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [mentorModalOpen, setMentorModalOpen] = useState(false);
  const [mentorMessage, setMentorMessage] = useState("");
  const [mentorSent, setMentorSent] = useState(false);

  const {
    data: course,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => courseService.getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Query authenticated student's enrollments safely
  const { data: enrollmentsData } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: async () => {
      try {
        return await learningService.listMyEnrollments();
      } catch {
        return { items: [], total: 0 };
      }
    },
    enabled: !!user,
  });

  const enrollment = enrollmentsData?.items?.find(
    (e) => e.course_id === courseId || e.course_id === course?.id
  );

  // Query detailed learning progress & completion flags when enrolled
  const { data: learningView } = useQuery<LearningCourse | null>({
    queryKey: ["learning-course", courseId],
    queryFn: async () => {
      try {
        if (typeof learningService.getCourseLearningView === "function") {
          return (await learningService.getCourseLearningView(courseId!)) ?? null;
        }
        return null;
      } catch {
        return null;
      }
    },
    enabled: !!user && !!courseId && !!enrollment,
  });

  // Query course quizzes safely
  const { data: courseQuizzes = [] } = useQuery<StudentCourseQuizItem[]>({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      try {
        if (typeof quizService?.listCourseQuizzes === "function") {
          return (await quizService.listCourseQuizzes(courseId!)) ?? [];
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!user && !!courseId,
  });

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: () => learningService.enrollCourse(courseId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["learning-course", courseId] });
      setEnrollError(null);
      navigate(`/learning/courses/${data.course_id}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to enroll in this course.";
      setEnrollError(msg);
    },
  });

  const isOwnerOrAdmin =
    course &&
    user &&
    (hasRole("ADMIN", "SUPER_ADMIN") || user.id === course.instructor_id);

  // Map lesson completion status from learningView or enrollment
  const completedLessonIds = useMemo(() => {
    const set = new Set<string>();
    if (learningView?.modules) {
      for (const mod of learningView.modules) {
        for (const les of mod.lessons) {
          if (les.is_completed) set.add(les.id);
        }
      }
    }
    if (learningView?.progress?.completed_lesson_ids) {
      for (const id of learningView.progress.completed_lesson_ids) {
        set.add(id);
      }
    }
    return set;
  }, [learningView]);

  // Compute progress percentage cleanly
  const progressPct = useMemo(() => {
    if (learningView?.progress) return Math.round(learningView.progress.progress_percentage);
    if (enrollment) return Math.round(enrollment.progress_percentage);
    return 0;
  }, [learningView, enrollment]);

  // Merge modules with completion stats and module-matched quizzes
  const enrichedModules = useMemo(() => {
    if (!course?.modules) return [];
    // Attach quizzes sensibly to content modules (skip module 0 orientation if >1 module)
    const contentModuleIndices = course.modules
      .map((m, i) => ({ m, i }))
      .filter(({ m, i }) => !(i === 0 && course.modules.length > 2 && m.title.toLowerCase().includes("general")));

    return course.modules.map((mod, idx) => {
      const lessonsWithStatus = mod.lessons.map((les) => {
        const isCompleted = completedLessonIds.has(les.id);
        return { ...les, isCompleted };
      });

      // Match quizzes: by content module index or matching first/second
      const modContentPos = contentModuleIndices.findIndex((x) => x.i === idx);
      const matchedQuizzes: StudentCourseQuizItem[] = [];
      if (courseQuizzes.length > 0 && modContentPos >= 0) {
        if (courseQuizzes[modContentPos]) {
          matchedQuizzes.push(courseQuizzes[modContentPos]);
        }
        // Attach any trailing quizzes to last content module
        if (modContentPos === contentModuleIndices.length - 1 && courseQuizzes.length > contentModuleIndices.length) {
          matchedQuizzes.push(...courseQuizzes.slice(contentModuleIndices.length));
        }
      } else if (idx === course.modules.length - 1 && courseQuizzes.length > 0 && contentModuleIndices.length === 0) {
        matchedQuizzes.push(...courseQuizzes);
      }

      const completedLessonsCount = lessonsWithStatus.filter((l) => l.isCompleted).length;
      const completedQuizzesCount = matchedQuizzes.filter((q) => q.is_passed || q.attempts_count > 0).length;
      const totalItems = lessonsWithStatus.length + matchedQuizzes.length;
      const completedItems = completedLessonsCount + completedQuizzesCount;

      return {
        ...mod,
        lessonsWithStatus,
        matchedQuizzes,
        completedItems,
        totalItems,
      };
    });
  }, [course, completedLessonIds, courseQuizzes]);

  // Determine "Up Next" activity
  const upNextItem = useMemo(() => {
    for (const mod of enrichedModules) {
      const pendingLesson = mod.lessonsWithStatus.find((l) => !l.isCompleted);
      if (pendingLesson) {
        return {
          type: "lesson" as const,
          id: pendingLesson.id,
          title: pendingLesson.title,
          label:
            pendingLesson.content_type === "pdf"
              ? "PPT SLIDES"
              : pendingLesson.content_type === "video"
              ? "VIDEO SESSION"
              : pendingLesson.content_type === "external_resource"
              ? "FORUM / LAB"
              : "READING",
          to: `/learning/courses/${course?.id}?lessonId=${pendingLesson.id}`,
        };
      }
      const pendingQuiz = mod.matchedQuizzes.find((q) => !q.is_passed);
      if (pendingQuiz) {
        return {
          type: "quiz" as const,
          id: pendingQuiz.id,
          title: pendingQuiz.title,
          label: pendingQuiz.title.toLowerCase().includes("self") ? "SELF-ASSESSMENT" : "GRADED QUIZ",
          to: `/learning/quizzes/${pendingQuiz.id}`,
        };
      }
    }
    const firstLesson = enrichedModules[0]?.lessonsWithStatus[0];
    return {
      type: "lesson" as const,
      id: firstLesson?.id || "",
      title: firstLesson?.title || "Start Course Curriculum",
      label: "COURSE MODULE",
      to: firstLesson
        ? `/learning/courses/${course?.id}?lessonId=${firstLesson.id}`
        : `/learning/courses/${course?.id}`,
    };
  }, [enrichedModules, course?.id]);

  const allCollapsed =
    enrichedModules.length > 0 && enrichedModules.every((m) => !!collapsedModules[m.id]);

  const toggleAllModules = () => {
    if (allCollapsed) {
      setCollapsedModules({});
    } else {
      const next: Record<string, boolean> = {};
      enrichedModules.forEach((m) => {
        next[m.id] = true;
      });
      setCollapsedModules(next);
    }
  };

  const toggleModule = (modId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="h-80 lg:col-span-3 rounded-xl" />
          <Skeleton className="h-96 lg:col-span-6 rounded-xl" />
          <Skeleton className="h-80 lg:col-span-3 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Course Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "This course could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => navigate("/courses")}>
          Return to Catalog
        </Button>
      </div>
    );
  }

  const instructorFullName = course.instructor
    ? `${course.instructor.first_name} ${course.instructor.last_name}`.trim()
    : "Learnova Faculty";
  const instructorInitials = course.instructor
    ? `${course.instructor.first_name?.[0] || "L"}${course.instructor.last_name?.[0] || "F"}`.toUpperCase()
    : "LF";

  // SVG Ring math
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Top Breadcrumb & Instructor Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/my-courses" className="hover:text-slate-900 font-medium transition-colors">
            My Courses
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-800">
            Course Overview
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/courses"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Catalog
          </Link>

          {isOwnerOrAdmin && (
            <>
              <Link to={`/instructor/courses/${course.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <Edit className="h-3.5 w-3.5" />
                  Edit Metadata
                </Button>
              </Link>
              <Link to={`/instructor/courses/${course.id}/builder`}>
                <Button size="sm" className="h-8 gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5" />
                  Curriculum Builder
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* HERO BANNER (Screenshot 5 Deep Petrol & Amber Circular Progress Ring) */}
      <div className="rounded-2xl bg-gradient-to-r from-[#063B50] via-[#052E40] to-[#04212E] p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-300/90">
              SEMESTER - 01 · {course.category?.name || "CURRICULUM"}
            </span>
            {enrollment && (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold px-2 py-0">
                Active Learner
              </Badge>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {course.title}
          </h1>

          <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl">
            {course.short_description}
          </p>

          {/* Pills Row matching Screenshot 5 */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <span className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
              <span className="w-5 h-5 rounded bg-amber-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center">
                {instructorInitials}
              </span>
              <span>{instructorFullName}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200">
              <Layers className="w-3.5 h-3.5 text-sky-300" />
              <span>{course.modules.length} sections</span>
            </span>

            <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-200 capitalize">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {course.duration_minutes > 0 ? `${course.duration_minutes} mins` : "Self-paced"} · {course.difficulty}
              </span>
            </span>
          </div>

          {enrollError && (
            <div className="mt-2 p-2.5 bg-rose-500/20 border border-rose-400/30 rounded-lg text-xs text-rose-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{enrollError}</span>
            </div>
          )}
        </div>

        {/* Right Side: Circular Ring & Amber Action CTA */}
        <div className="flex flex-col items-center justify-center gap-3 shrink-0 md:min-w-[140px]">
          {enrollment ? (
            <>
              {/* Circular SVG Progress Ring matching Screenshot 5 */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-24 h-24 -rotate-90 transform" viewBox="0 0 96 96">
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="transparent"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    fill="transparent"
                    stroke="#E59819"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-lg font-extrabold text-white leading-none">
                    {progressPct}%
                  </span>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-300 mt-1">
                    COMPLETE
                  </span>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/learning/courses/${course.id}`)}
                className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs px-5 py-2 rounded-lg shadow-md flex items-center gap-1.5"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                <span>Resume Learning</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : course.status === "published" ? (
            <div className="flex flex-col items-center gap-2">
              {user ? (
                <Button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                  className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs shadow-md flex items-center gap-2"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}</span>
                </Button>
              ) : (
                <Link to="/login">
                  <Button className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold px-6 py-2.5 rounded-lg text-xs shadow-md">
                    Sign in to Enroll
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Badge className="bg-slate-800 text-slate-300 capitalize">{course.status}</Badge>
          )}
        </div>
      </div>

      {/* SUB-TABS BAR: Course | Grades | About & Objectives (Screenshot 5) */}
      <div className="border-b border-slate-200 flex items-center gap-6 px-1">
        <button
          type="button"
          onClick={() => setActiveTab("course")}
          className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "course"
              ? "border-[#E59819] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Course
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("grades")}
          className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "grades"
              ? "border-[#E59819] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Grades ({courseQuizzes.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`py-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === "overview"
              ? "border-[#E59819] text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          About &amp; Objectives
        </button>
      </div>

      {/* TAB 1: COURSE WORKSPACE (Screenshot 5 Three-Column Grid) */}
      {activeTab === "course" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Contents Outline Card (3 cols - active for enrolled hub) */}
          {enrollment && (
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3 lg:sticky lg:top-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-900">Contents</h3>
                <button
                  type="button"
                  onClick={toggleAllModules}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                >
                  {allCollapsed ? "Expand all" : "Collapse all"}
                </button>
              </div>

              {enrichedModules.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No sections yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {enrichedModules.map((mod) => {
                    const isModDone = mod.totalItems > 0 && mod.completedItems === mod.totalItems;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                          setCollapsedModules((prev) => ({ ...prev, [mod.id]: false }));
                          document
                            .getElementById(`course-section-${mod.id}`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                        className="w-full flex items-center justify-between gap-2 p-2 rounded-lg text-left hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isModDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-300 group-hover:text-amber-500 shrink-0" />
                          )}
                          <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 truncate">
                            {mod.title}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-400 shrink-0">
                          {mod.completedItems}/{mod.totalItems}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* CENTER COLUMN: Collapsible Module Accordions (6 cols when enrolled, 9 cols when catalog preview) */}
          <div className={`${enrollment ? "lg:col-span-6" : "lg:col-span-9"} space-y-4`}>
            {enrichedModules.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
                Curriculum under active authoring.
              </div>
            ) : (
              enrichedModules.map((mod) => {
                const isCollapsed = !!collapsedModules[mod.id];
                const modPct =
                  mod.totalItems > 0 ? Math.round((mod.completedItems / mod.totalItems) * 100) : 0;

                return (
                  <div
                    key={mod.id}
                    id={`course-section-${mod.id}`}
                    className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                  >
                    {/* Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleModule(mod.id)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {mod.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-16 sm:w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full transition-all ${
                              modPct === 100 ? "bg-emerald-500" : "bg-[#E59819]"
                            }`}
                            style={{ width: `${modPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-500">
                          {mod.completedItems}/{mod.totalItems}
                        </span>
                      </div>
                    </button>

                    {/* Accordion Body */}
                    {!isCollapsed && (
                      <div className="border-t border-slate-100 divide-y divide-slate-100">
                        {mod.lessonsWithStatus.map((les) => {
                          const isForum = les.content_type === "external_resource";
                          const isVideo = les.content_type === "video";
                          const isSlides = les.content_type === "pdf";

                          const typeLabel = isForum
                            ? "FORUM / LAB"
                            : isVideo
                            ? "VIDEO"
                            : isSlides
                            ? "PPT SLIDES"
                            : "READING";

                          const iconBg = isForum
                            ? "bg-rose-50 text-rose-500 border-rose-100"
                            : isVideo
                            ? "bg-purple-50 text-purple-600 border-purple-100"
                            : isSlides
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                            : "bg-sky-50 text-sky-600 border-sky-100";

                          return (
                            <div
                              key={les.id}
                              className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}
                                >
                                  {isForum ? (
                                    <MessageSquare className="w-4 h-4" />
                                  ) : isVideo ? (
                                    <Video className="w-4 h-4" />
                                  ) : isSlides ? (
                                    <Presentation className="w-4 h-4" />
                                  ) : (
                                    <FileText className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  {enrollment ? (
                                    <Link
                                      to={`/learning/courses/${course.id}?lessonId=${les.id}`}
                                      className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors block truncate"
                                    >
                                      {les.title}
                                    </Link>
                                  ) : (
                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 block truncate">
                                      {les.title}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                    <span>{typeLabel}</span>
                                    {les.duration_minutes > 0 && (
                                      <>
                                        <span>·</span>
                                        <span>{les.duration_minutes}m</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                {enrollment ? (
                                  <>
                                    <Link
                                      to={`/learning/courses/${course.id}?lessonId=${les.id}`}
                                      className="text-xs font-semibold text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                                    >
                                      <span>{les.isCompleted ? "Review" : "Open"}</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                    {les.isCompleted ? (
                                      <div
                                        className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center"
                                        title="Completed"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                      </div>
                                    ) : (
                                      <div
                                        className="w-5 h-5 rounded-full border border-slate-300 text-slate-300 flex items-center justify-center"
                                        title="Pending"
                                      />
                                    )}
                                  </>
                                ) : les.is_preview ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px] gap-1 text-primary"
                                    onClick={() => setSelectedPreviewLesson(les)}
                                  >
                                    <Eye className="h-3 w-3" />
                                    Preview
                                  </Button>
                                ) : isOwnerOrAdmin ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2.5 text-[11px] gap-1"
                                    onClick={() => setSelectedPreviewLesson(les)}
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}

                        {/* Matched Module Assessments & Quizzes */}
                        {mod.matchedQuizzes.map((quiz) => (
                          <div
                            key={quiz.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-amber-50/40 transition-colors group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg border bg-amber-50 text-amber-600 border-amber-200 flex items-center justify-center shrink-0">
                                <CheckSquare className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <Link
                                  to={`/learning/quizzes/${quiz.id}`}
                                  className="text-xs sm:text-sm font-semibold text-slate-800 group-hover:text-amber-700 transition-colors block truncate"
                                >
                                  {quiz.title}
                                </Link>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                                  <span>
                                    {quiz.title.toLowerCase().includes("self")
                                      ? "SELF-ASSESSMENT"
                                      : "GRADED QUIZ"}
                                  </span>
                                  <span>·</span>
                                  <span>{quiz.question_count} Questions</span>
                                  {quiz.best_score_percentage !== null &&
                                    quiz.best_score_percentage !== undefined && (
                                      <>
                                        <span>·</span>
                                        <span className="text-emerald-600">
                                          Best: {quiz.best_score_percentage}%
                                        </span>
                                      </>
                                    )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <Link
                                to={`/learning/quizzes/${quiz.id}`}
                                className="text-xs font-semibold text-slate-600 hover:text-amber-700 flex items-center gap-1 transition-colors"
                              >
                                <span>{quiz.attempts_count > 0 ? "Review" : "Attempt"}</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                              {quiz.is_passed || quiz.attempts_count > 0 ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* RIGHT COLUMN: Up Next, Course Mentor, Your Progress (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* 1. Dark Petrol "Up next" card (Screenshot 5 - shown when enrolled) */}
            {enrollment && (
              <div className="rounded-xl bg-gradient-to-br from-[#063B50] to-[#042330] p-5 text-white shadow-sm border border-[#144E6D]/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-[#E59819]" />
                  <span>Up next</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">
                    {upNextItem.title}
                  </h4>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    {upNextItem.label}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(upNextItem.to)}
                  className="w-full bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Resume</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* 2. "Course mentor" Card (Screenshot 5) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-900">Course mentor</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#063B50] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                  {instructorInitials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{instructorFullName}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    INSTRUCTOR
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMentorSent(false);
                  setMentorModalOpen(true);
                }}
                className="w-full h-8 text-xs font-semibold text-slate-700 border-slate-200 hover:bg-slate-50 gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                <span>Message mentor</span>
              </Button>
            </div>

            {/* 3. "Your progress" Card (Screenshot 5 - shown when enrolled) */}
            {enrollment && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Your progress</h4>
                <div className="space-y-3">
                  {enrichedModules.map((mod) => {
                    const pct =
                      mod.totalItems > 0 ? Math.round((mod.completedItems / mod.totalItems) * 100) : 0;
                    return (
                      <div key={mod.id} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-slate-600 font-medium truncate">{mod.title}</span>
                          <span className="font-bold text-slate-800 shrink-0">
                            {mod.completedItems}/{mod.totalItems}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct === 100 ? "bg-emerald-500" : "bg-[#E59819]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GRADES TABLE */}
      {activeTab === "grades" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Course Grades &amp; Assessments</h3>
              <p className="text-xs text-slate-500">
                Real-time assessment scores and completion milestones for {course.title}.
              </p>
            </div>
            <Link to="/grades">
              <Button variant="outline" size="sm" className="text-xs h-8">
                Full Transcript
              </Button>
            </Link>
          </div>
          {courseQuizzes.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No graded assessments configured for this course yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-5 py-3">Assessment Title</th>
                    <th className="px-5 py-3">Questions</th>
                    <th className="px-5 py-3">Passing Score</th>
                    <th className="px-5 py-3">Best Grade</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {courseQuizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5 font-semibold text-slate-800">{q.title}</td>
                      <td className="px-5 py-3.5 text-slate-600">{q.question_count}</td>
                      <td className="px-5 py-3.5 text-slate-600">{q.passing_score_percentage}%</td>
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {q.best_score_percentage !== null && q.best_score_percentage !== undefined
                          ? `${q.best_score_percentage}%`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {q.is_passed ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                            Passed
                          </Badge>
                        ) : q.attempts_count > 0 ? (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                            In Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            Not Attempted
                          </Badge>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/learning/quizzes/${q.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-bold"
                        >
                          {q.attempts_count > 0 ? "Review / Retake →" : "Attempt →"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: OVERVIEW & OBJECTIVES */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">About This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-line text-slate-700">
                  {course.description.replace(/<[^>]+>/g, "")}
                </div>
              </CardContent>
            </Card>

            {course.learning_objectives.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    What You&apos;ll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {course.learning_objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span className="text-slate-700">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {course.prerequisites.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-indigo-600" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs">
                    {course.prerequisites.map((prereq, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>{prereq}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Lesson Preview Modal (Preserved for public preview / tests) */}
      {selectedPreviewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <Badge variant="outline" className="capitalize text-[10px] mb-1">
                  {selectedPreviewLesson.content_type}
                </Badge>
                <h3 className="font-semibold text-base text-foreground">
                  {selectedPreviewLesson.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedPreviewLesson(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {selectedPreviewLesson.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedPreviewLesson.description}
                </p>
              )}

              {selectedPreviewLesson.content_type === "text" && selectedPreviewLesson.text_content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line bg-muted/30 p-4 rounded-lg border border-border">
                  {selectedPreviewLesson.text_content}
                </div>
              ) : selectedPreviewLesson.resource_url ? (
                <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-3 text-center">
                  <p className="text-xs text-muted-foreground">Multimedia Resource Reference:</p>
                  <a
                    href={selectedPreviewLesson.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium break-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {selectedPreviewLesson.resource_url}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Content preview is not available for this lesson.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedPreviewLesson(null)}>
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mentor Message Modal */}
      {mentorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-[#063B50] text-white font-bold text-xs flex items-center justify-center">
                  {instructorInitials}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Message {instructorFullName}</h4>
                  <p className="text-[11px] text-slate-500">{course.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMentorModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mentorSent ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-2 text-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold">Inquiry delivered to {instructorFullName}!</p>
                <p>For immediate 24/7 slide explanations, you can also ask the Learnova AI Copilot.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (mentorMessage.trim()) {
                    setMentorSent(true);
                    setMentorMessage("");
                  }
                }}
                className="space-y-3"
              >
                <textarea
                  rows={4}
                  value={mentorMessage}
                  onChange={(e) => setMentorMessage(e.target.value)}
                  placeholder="Ask your mentor a question about module labs, deadlines, or concepts..."
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#063B50]/20"
                  required
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMentorModalOpen(false);
                      window.dispatchEvent(new CustomEvent("open-ai-copilot"));
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI Copilot instead
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[#063B50] hover:bg-[#052E40] text-white text-xs gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Message
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

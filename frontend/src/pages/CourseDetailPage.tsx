import { useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  ListOrdered,
  MessageSquare,
  PlayCircle,
  Presentation,
  Search,
  Send,
  Sparkles,
  Video,
  X,
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

type FormatFilter = "all" | "text" | "pdf" | "video" | "quiz";

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

  // Interactive workbench filters
  const [lessonSearch, setLessonSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [layoutMode, setLayoutMode] = useState<"roadmap" | "grid">("roadmap");

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

  const progressPct = useMemo(() => {
    if (learningView?.progress) return Math.round(learningView.progress.progress_percentage);
    if (enrollment) return Math.round(enrollment.progress_percentage);
    return 0;
  }, [learningView, enrollment]);

  const enrichedModules = useMemo(() => {
    if (!course?.modules) return [];
    const contentModuleIndices = course.modules
      .map((m, i) => ({ m, i }))
      .filter(
        ({ m, i }) =>
          !(i === 0 && course.modules.length > 2 && m.title.toLowerCase().includes("general"))
      );

    return course.modules.map((mod, idx) => {
      const lessonsWithStatus = mod.lessons.map((les) => ({
        ...les,
        isCompleted: completedLessonIds.has(les.id),
      }));

      const modContentPos = contentModuleIndices.findIndex((x) => x.i === idx);
      const matchedQuizzes: StudentCourseQuizItem[] = [];
      if (courseQuizzes.length > 0 && modContentPos >= 0) {
        if (courseQuizzes[modContentPos]) {
          matchedQuizzes.push(courseQuizzes[modContentPos]);
        }
        if (
          modContentPos === contentModuleIndices.length - 1 &&
          courseQuizzes.length > contentModuleIndices.length
        ) {
          matchedQuizzes.push(...courseQuizzes.slice(contentModuleIndices.length));
        }
      } else if (
        idx === course.modules.length - 1 &&
        courseQuizzes.length > 0 &&
        contentModuleIndices.length === 0
      ) {
        matchedQuizzes.push(...courseQuizzes);
      }

      const completedLessonsCount = lessonsWithStatus.filter((l) => l.isCompleted).length;
      const completedQuizzesCount = matchedQuizzes.filter(
        (q) => q.is_passed || q.attempts_count > 0
      ).length;
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
          label: pendingQuiz.title.toLowerCase().includes("self")
            ? "SELF-ASSESSMENT"
            : "GRADED QUIZ",
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
          <Skeleton className="h-80 lg:col-span-8 rounded-2xl" />
          <Skeleton className="h-80 lg:col-span-4 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="font-display text-xl font-bold text-foreground">Course Unavailable</h2>
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

  const qSearch = lessonSearch.trim().toLowerCase();

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link to="/my-courses" className="hover:text-foreground font-semibold transition-colors">
            My Courses
          </Link>
          <span>/</span>
          <span className="font-bold text-foreground">Course Workbench</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-xl bg-card border border-border transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Catalog
          </Link>

          {isOwnerOrAdmin && (
            <>
              <Link to={`/instructor/courses/${course.id}/edit`}>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs rounded-xl">
                  <Edit className="h-3.5 w-3.5" />
                  Edit Metadata
                </Button>
              </Link>
              <Link to={`/instructor/courses/${course.id}/builder`}>
                <Button size="sm" className="h-8 gap-1.5 text-xs rounded-xl bg-teal-600 hover:bg-teal-700 text-white">
                  <Layers className="h-3.5 w-3.5" />
                  Curriculum Builder
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* STUDIO WORKBENCH HEADER CARD (Replaces JAIN petrol banner) */}
      <div className="studio-card p-6 sm:p-8 border-t-4 border-t-teal-600 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              {course.category?.name || "Engineering Track"}
            </span>
            {enrollment && (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-[11px] font-bold">
                Active Learner
              </Badge>
            )}
          </div>

          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {course.title}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            {course.short_description}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
            <span className="inline-flex items-center gap-2 bg-secondary/70 border border-border rounded-xl px-3 py-1.5 font-semibold text-foreground">
              <span className="w-5 h-5 rounded-md bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center">
                {instructorInitials}
              </span>
              <span>{instructorFullName}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 bg-secondary/70 border border-border rounded-xl px-3 py-1.5 font-mono text-foreground">
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>{course.modules.length} modules</span>
            </span>

            <span className="inline-flex items-center gap-1.5 bg-secondary/70 border border-border rounded-xl px-3 py-1.5 font-mono text-foreground capitalize">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>
                {course.duration_minutes > 0 ? `${course.duration_minutes} mins` : "Self-paced"} ·{" "}
                {course.difficulty}
              </span>
            </span>
          </div>

          {enrollError && (
            <div className="mt-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{enrollError}</span>
            </div>
          )}
        </div>

        {/* Right Action & Mastery Pod */}
        <div className="lg:col-span-4 bg-secondary/50 border border-border rounded-2xl p-5 flex flex-col justify-between gap-4">
          {enrollment ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-muted-foreground uppercase font-mono">
                  Course Completion
                </span>
                <span className="font-display text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {progressPct}%
                </span>
              </div>

              <div className="w-full h-2.5 bg-background rounded-full overflow-hidden border border-border">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPct >= 100 ? "bg-emerald-500" : "bg-teal-600"
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <Button
                onClick={() => navigate(`/learning/courses/${course.id}`)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-[0_3px_0_0_#0f766e] flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle className="h-4 w-4" />
                <span>Resume Learning</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : course.status === "published" ? (
            <div className="space-y-3 text-center">
              <p className="text-xs text-muted-foreground">
                Enroll to unlock the Zen Classroom, interactive slide decks, and RAG Copilot notes.
              </p>
              {user ? (
                <Button
                  onClick={() => enrollMutation.mutate()}
                  disabled={enrollMutation.isPending}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-[0_3px_0_0_#0f766e] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>{enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}</span>
                </Button>
              ) : (
                <Link to="/login" className="block">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs">
                    Sign in to Enroll
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Badge className="mx-auto capitalize">{course.status}</Badge>
          )}
        </div>
      </div>

      {/* STUDIO WORKSPACE SUB-TABS & INTERACTIVE FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-2">
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => setActiveTab("course")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "course"
                ? "border-teal-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Learning Roadmap
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("grades")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "grades"
                ? "border-teal-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Grades ({courseQuizzes.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview"
                ? "border-teal-600 text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            About &amp; Objectives
          </button>
        </div>

        {activeTab === "course" && (
          <div className="flex flex-wrap items-center gap-2">
            {enrollment && (
              <div className="inline-flex p-0.5 rounded-lg bg-card border border-border">
                <button
                  type="button"
                  onClick={() => setLayoutMode("roadmap")}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    layoutMode === "roadmap" ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <ListOrdered className="w-3 h-3" /> Roadmap
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("grid")}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                    layoutMode === "grid" ? "bg-secondary text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <LayoutGrid className="w-3 h-3" /> Grid
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-[11px] font-bold hover:bg-teal-500/20 transition-colors cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Course Q&amp;A</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: LEARNING ROADMAP WORKBENCH */}
      {activeTab === "course" && (
        <div className="space-y-5">
          {/* Interactive Search & Format Chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={lessonSearch}
                onChange={(e) => setLessonSearch(e.target.value)}
                placeholder="Filter modules, slides, videos, quizzes..."
                className="w-full pl-8 pr-3 py-1.5 bg-card border border-border rounded-xl text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  { id: "all", label: "All Formats" },
                  { id: "text", label: "Readings" },
                  { id: "pdf", label: "Slide Decks" },
                  { id: "video", label: "Video Labs" },
                  { id: "quiz", label: "Quizzes" },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setFormatFilter(chip.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    formatFilter === chip.id
                      ? "bg-foreground text-background"
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* MAIN ROADMAP / GRID COLUMN (8 cols when enrolled, 9 cols when catalog preview) */}
            <div
              className={`${
                enrollment ? "lg:col-span-8" : "lg:col-span-9"
              } ${layoutMode === "grid" && enrollment ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}`}
            >
              {enrichedModules.length === 0 ? (
                <div className="studio-card p-8 text-center text-xs text-muted-foreground">
                  Curriculum under active authoring.
                </div>
              ) : (
                enrichedModules.map((mod, mIdx) => {
                  const isCollapsed = !!collapsedModules[mod.id];
                  const modPct =
                    mod.totalItems > 0
                      ? Math.round((mod.completedItems / mod.totalItems) * 100)
                      : 0;

                  const visibleLessons = mod.lessonsWithStatus.filter((les) => {
                    const matchesSearch =
                      !qSearch || les.title.toLowerCase().includes(qSearch);
                    const matchesType =
                      formatFilter === "all" ||
                      (formatFilter !== "quiz" && les.content_type === formatFilter);
                    return matchesSearch && matchesType;
                  });

                  const visibleQuizzes = mod.matchedQuizzes.filter((quiz) => {
                    const matchesSearch =
                      !qSearch || quiz.title.toLowerCase().includes(qSearch);
                    const matchesType = formatFilter === "all" || formatFilter === "quiz";
                    return matchesSearch && matchesType;
                  });

                  if (
                    (qSearch || formatFilter !== "all") &&
                    visibleLessons.length === 0 &&
                    visibleQuizzes.length === 0
                  ) {
                    return null;
                  }

                  return (
                    <div
                      key={mod.id}
                      id={`course-section-${mod.id}`}
                      className="studio-card overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => toggleModule(mod.id)}
                        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-secondary/50 transition-colors text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-teal-500/12 text-teal-700 dark:text-teal-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            0{mIdx + 1}
                          </span>
                          <div className="min-w-0 flex items-center gap-2">
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-teal-600 shrink-0" />
                            )}
                            <span className="font-display text-sm sm:text-base font-bold text-foreground truncate">
                              {mod.title}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-16 sm:w-24 h-1.5 bg-secondary rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full rounded-full transition-all ${
                                modPct === 100 ? "bg-emerald-500" : "bg-teal-600"
                              }`}
                              style={{ width: `${modPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono font-bold text-muted-foreground">
                            {mod.completedItems}/{mod.totalItems}
                          </span>
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="border-t border-border divide-y divide-border">
                          {visibleLessons.map((les) => {
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
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              : isVideo
                              ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                              : isSlides
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20";

                            return (
                              <div
                                key={les.id}
                                className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-secondary/40 transition-colors group"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${iconBg}`}
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
                                        className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors block truncate"
                                      >
                                        {les.title}
                                      </Link>
                                    ) : (
                                      <span className="text-xs sm:text-sm font-semibold text-foreground block truncate">
                                        {les.title}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
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
                                        className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1"
                                      >
                                        <span>{les.isCompleted ? "Review" : "Open"}</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </Link>
                                      {les.isCompleted ? (
                                        <div
                                          className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center"
                                          title="Completed"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                      ) : (
                                        <div
                                          className="w-5 h-5 rounded-full border border-border text-muted-foreground flex items-center justify-center"
                                          title="Pending"
                                        />
                                      )}
                                    </>
                                  ) : les.is_preview ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2.5 text-[11px] gap-1 text-teal-700 dark:text-teal-300 border-teal-500/30"
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

                          {visibleQuizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-orange-500/5 transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl border bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 flex items-center justify-center shrink-0">
                                  <CheckSquare className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <Link
                                    to={`/learning/quizzes/${quiz.id}`}
                                    className="text-xs sm:text-sm font-semibold text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors block truncate"
                                  >
                                    {quiz.title}
                                  </Link>
                                  <div className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground mt-0.5">
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
                                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                                >
                                  <span>{quiz.attempts_count > 0 ? "Review" : "Attempt"}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                                {quiz.is_passed || quiz.attempts_count > 0 ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-border" />
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

            {/* RIGHT SIDEBAR PODS (4 cols when enrolled, 3 cols catalog mentor) */}
            <div className={`${enrollment ? "lg:col-span-4" : "lg:col-span-3"} space-y-4`}>
              {/* Next Step Spotlight */}
              {enrollment && (
                <div className="studio-card p-5 border-l-4 border-l-orange-500 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase font-bold text-orange-600 dark:text-orange-400">
                      Up Next in Queue
                    </span>
                    <button
                      type="button"
                      onClick={toggleAllModules}
                      className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {allCollapsed ? "Expand all" : "Collapse all"}
                    </button>
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-bold text-foreground line-clamp-2">
                      {upNextItem.title}
                    </h4>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {upNextItem.label}
                    </p>
                  </div>
                  <Button
                    onClick={() => navigate(upNextItem.to)}
                    className="w-full bg-foreground hover:bg-foreground/90 text-background font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Jump to Activity</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {/* Course Mentor Pod */}
              <div className="studio-card p-5 space-y-4">
                <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Course Mentor
                </h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {instructorInitials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{instructorFullName}</p>
                    <span className="text-[10px] font-mono uppercase text-muted-foreground">
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
                  className="w-full h-8 text-xs font-semibold rounded-xl gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-teal-600" />
                  <span>Message mentor</span>
                </Button>
              </div>

              {/* Module Breakdown (Enrolled only) */}
              {enrollment && (
                <div className="studio-card p-5 space-y-3">
                  <h4 className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Module Progress
                  </h4>
                  <div className="space-y-3">
                    {enrichedModules.map((mod) => {
                      const pct =
                        mod.totalItems > 0
                          ? Math.round((mod.completedItems / mod.totalItems) * 100)
                          : 0;
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
                          className="w-full text-left space-y-1 group cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-[11px] gap-2">
                            <span className="text-foreground font-medium truncate group-hover:text-teal-700 dark:group-hover:text-teal-400">
                              {mod.title}
                            </span>
                            <span className="font-mono font-bold text-muted-foreground shrink-0">
                              {mod.completedItems}/{mod.totalItems}
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct === 100 ? "bg-emerald-500" : "bg-teal-600"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GRADES TABLE */}
      {activeTab === "grades" && (
        <div className="studio-card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Course Grades &amp; Assessments
              </h3>
              <p className="text-xs text-muted-foreground">
                Real-time assessment scores and completion milestones.
              </p>
            </div>
            <Link to="/grades">
              <Button variant="outline" size="sm" className="text-xs h-8 rounded-xl">
                Full Transcript
              </Button>
            </Link>
          </div>
          {courseQuizzes.length === 0 ? (
            <div className="p-10 text-center text-xs text-muted-foreground">
              No graded assessments configured for this course yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-secondary/60 text-muted-foreground uppercase text-[10px] font-mono font-bold">
                  <tr>
                    <th className="px-5 py-3">Assessment Title</th>
                    <th className="px-5 py-3">Questions</th>
                    <th className="px-5 py-3">Passing Score</th>
                    <th className="px-5 py-3">Best Grade</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courseQuizzes.map((q) => (
                    <tr key={q.id} className="hover:bg-secondary/40">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{q.title}</td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {q.question_count}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-muted-foreground">
                        {q.passing_score_percentage}%
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-foreground">
                        {q.best_score_percentage !== null && q.best_score_percentage !== undefined
                          ? `${q.best_score_percentage}%`
                          : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        {q.is_passed ? (
                          <Badge variant="success" className="text-[10px]">
                            Passed
                          </Badge>
                        ) : q.attempts_count > 0 ? (
                          <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25 text-[10px]">
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
                          className="text-teal-700 dark:text-teal-400 hover:underline font-bold"
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
            <Card className="studio-card">
              <CardHeader>
                <CardTitle className="font-display text-base">About This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none whitespace-pre-line text-foreground/85">
                  {course.description.replace(/<[^>]+>/g, "")}
                </div>
              </CardContent>
            </Card>

            {course.learning_objectives.length > 0 && (
              <Card className="studio-card">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    What You&apos;ll Learn
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {course.learning_objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-600 mt-1.5 shrink-0" />
                        <span className="text-foreground/90">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            {course.prerequisites.length > 0 && (
              <Card className="studio-card">
                <CardHeader>
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <ListOrdered className="h-5 w-5 text-orange-500" />
                    Prerequisites
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-xs">
                    {course.prerequisites.map((prereq, i) => (
                      <li key={i} className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
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

      {/* Lesson Preview Modal */}
      {selectedPreviewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <Badge variant="outline" className="capitalize text-[10px] mb-1">
                  {selectedPreviewLesson.content_type}
                </Badge>
                <h3 className="font-display font-bold text-base text-foreground">
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

              {selectedPreviewLesson.content_type === "text" &&
              selectedPreviewLesson.text_content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line bg-secondary/40 p-4 rounded-xl border border-border">
                  {selectedPreviewLesson.text_content}
                </div>
              ) : selectedPreviewLesson.resource_url ? (
                <div className="p-4 bg-secondary/40 rounded-xl border border-border space-y-3 text-center">
                  <p className="text-xs text-muted-foreground">Multimedia Resource Reference:</p>
                  <a
                    href={selectedPreviewLesson.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-teal-700 dark:text-teal-400 hover:underline font-medium break-all"
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
          <div className="bg-card border border-border rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                  {instructorInitials}
                </div>
                <div>
                  <h4 className="font-display text-sm font-bold text-foreground">
                    Message {instructorFullName}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">{course.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMentorModalOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {mentorSent ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs space-y-2 text-center">
                <CheckCircle2 className="w-6 h-6 mx-auto" />
                <p className="font-bold">Inquiry delivered to {instructorFullName}!</p>
                <p>For instant slide citations, you can also ask the Learnova AI Copilot.</p>
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
                  className="w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                  required
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMentorModalOpen(false);
                      window.dispatchEvent(new CustomEvent("open-ai-copilot"));
                    }}
                    className="text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Ask AI Copilot instead
                  </button>
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs gap-1.5"
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

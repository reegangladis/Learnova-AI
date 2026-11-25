import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Video,
  Presentation,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Menu,
  X,
  CheckSquare,
  WifiOff,
  RefreshCw,
  Check,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { learningService } from "@/services/learningService";
import { quizService } from "@/services/quizService";
import {
  enqueueProgress,
  getPendingForCourse,
  dequeueCourseItems,
  subscribeToQueue,
} from "@/services/offlineQueue";
import { AITutorPanel } from "@/components/ai/AITutorPanel";
import { VideoLessonPlayer } from "@/components/learning/VideoLessonPlayer";
import { LearningLesson, SlideDeckItem } from "@/types/learning";
import { StudentCourseQuizItem } from "@/types/quiz";

function renderInlineFormatting(text: string): React.ReactNode[] {
  // Strip any simple HTML tags if coming from init_db HTML strings cleanly
  const clean = text.replace(/<\/?(p|div)>/g, "").trim();
  const tokens = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-slate-900">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[11px] text-indigo-700"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function FormattedLessonProse({ text }: { text: string }) {
  // Normalize HTML tags from init_db.py if present so plain text renders nicely
  const normalized = text
    .replace(/<h3>/gi, "\n### ")
    .replace(/<\/h3>/gi, "\n")
    .replace(/<h4>/gi, "\n#### ")
    .replace(/<\/h4>/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>|<\/?ul>|<\/?ol>/gi, "\n");

  const blocks = normalized.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  return (
    <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
      {blocks.map((block, bIdx) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        // Single heading line
        if (lines.length === 1 && lines[0].startsWith("### ")) {
          return (
            <h3 key={bIdx} className="text-base sm:text-lg font-extrabold text-slate-900 pt-2">
              {lines[0].replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (lines.length === 1 && lines[0].startsWith("#### ")) {
          return (
            <h4 key={bIdx} className="text-sm sm:text-base font-bold text-slate-800 pt-1">
              {lines[0].replace(/^####\s+/, "")}
            </h4>
          );
        }

        // Mixed heading + content lines inside one block
        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (listItems.length > 0) {
            elements.push(
              <ul key={`${keyPrefix}-ul`} className="space-y-2 pl-5 list-disc text-slate-700">
                {listItems.map((li, lIdx) => (
                  <li key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(li)}
                  </li>
                ))}
              </ul>
            );
            listItems = [];
          }
        };

        lines.forEach((line, lIdx) => {
          if (line.startsWith("### ")) {
            flushList(`${bIdx}-${lIdx}`);
            elements.push(
              <h3 key={`${bIdx}-${lIdx}-h3`} className="text-base sm:text-lg font-extrabold text-slate-900 pt-2">
                {line.replace(/^###\s+/, "")}
              </h3>
            );
          } else if (line.startsWith("#### ")) {
            flushList(`${bIdx}-${lIdx}`);
            elements.push(
              <h4 key={`${bIdx}-${lIdx}-h4`} className="text-sm sm:text-base font-bold text-slate-800 pt-1">
                {line.replace(/^####\s+/, "")}
              </h4>
            );
          } else if (line.startsWith("- ") || line.startsWith("• ")) {
            listItems.push(line.replace(/^[-•]\s+/, ""));
          } else {
            flushList(`${bIdx}-${lIdx}`);
            elements.push(
              <p key={`${bIdx}-${lIdx}-p`} className="leading-relaxed text-slate-700 whitespace-pre-wrap">
                {renderInlineFormatting(line)}
              </p>
            );
          }
        });
        flushList(`${bIdx}-end`);

        return (
          <div key={bIdx} className="space-y-3">
            {elements}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_FALLBACK_SLIDES: SlideDeckItem[] = [
  {
    slide_number: 1,
    title: "1. Core Architecture & Engineering Primitives",
    content: "Modular abstraction boundaries, stateless service contracts, and declarative orchestration.",
    key_takeaways: [
      "Separate control plane logic from data plane throughput",
      "Enforce immutable build artifacts across environments",
    ],
  },
  {
    slide_number: 2,
    title: "2. Scalability & High-Availability Patterns",
    content: "Horizontal auto-scaling, health probes, and graceful load shedding under peak demand.",
    key_takeaways: [
      "Eliminate single points of failure with multi-zone replication",
      "Implement circuit breakers and bounded retry backoff",
    ],
  },
  {
    slide_number: 3,
    title: "3. Security, Identity & Least Privilege",
    content: "Zero Trust cryptographic validation across east-west microservice boundaries.",
    key_takeaways: [
      "Authenticate every request dynamically with short-lived tokens",
      "Enforce non-root execution and minimal runtime footprints",
    ],
  },
  {
    slide_number: 4,
    title: "4. Observability, Tracing & SLIs",
    content: "Structured telemetry across metrics, distributed traces, and audit streams.",
    key_takeaways: [
      "Track p95/p99 tail latency rather than misleading averages",
      "Alert on actionable SLO burn rates",
    ],
  },
  {
    slide_number: 5,
    title: "5. Automated CI/CD & Testing Gates",
    content: "Continuous integration validation combining unit specs, contract schemas, and CVE scans.",
    key_takeaways: [
      "Prevent regressions before merging to production branches",
      "Support rapid, zero-downtime canary rollbacks",
    ],
  },
  {
    slide_number: 6,
    title: "6. Operational Runbooks & Mastery Summary",
    content: "Production readiness checklist and review preparation for module assessments.",
    key_takeaways: [
      "Document failure recovery paths cleanly",
      "Proceed to the module Self-Assessment to validate concepts",
    ],
  },
];

export function CourseLearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    searchParams.get("lessonId")
  );
  const [modulesDrawerOpen, setModulesDrawerOpen] = useState(false);
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const [aiTutorOpen, setAiTutorOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Keep selectedLessonId synced with URL ?lessonId=
  useEffect(() => {
    const paramLessonId = searchParams.get("lessonId");
    if (paramLessonId && paramLessonId !== selectedLessonId) {
      setSelectedLessonId(paramLessonId);
      setCurrentSlide(1);
    }
  }, [searchParams, selectedLessonId]);

  // Offline queue count
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() =>
    courseId ? getPendingForCourse(courseId).length : 0
  );

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = subscribeToQueue(() => {
      if (courseId) {
        setPendingOfflineCount(getPendingForCourse(courseId).length);
      }
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, [courseId]);

  // Sync offline queue when coming back online
  const syncOfflineUpdates = useCallback(async () => {
    if (!courseId || !isOnline || isSyncing) return;
    const pending = getPendingForCourse(courseId);
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const updates = pending.map((p) => ({
        lesson_id: p.lessonId,
        is_completed: p.isCompleted,
        playback_position_seconds: p.playbackPositionSeconds,
        playback_duration_seconds: p.playbackDurationSeconds,
        client_timestamp: p.queuedAt,
      }));

      await learningService.syncOfflineProgress(courseId, updates);
      dequeueCourseItems(courseId);
      setPendingOfflineCount(0);
      queryClient.invalidateQueries({ queryKey: ["learning-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    } catch {
      // Retain items in queue on sync failure
    } finally {
      setIsSyncing(false);
    }
  }, [courseId, isOnline, isSyncing, queryClient]);

  useEffect(() => {
    if (isOnline && pendingOfflineCount > 0) {
      const timer = setTimeout(() => {
        void syncOfflineUpdates();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingOfflineCount, syncOfflineUpdates]);

  // Fetch course learning syllabus & progress
  const {
    data: learningCourse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["learning-course", courseId],
    queryFn: () => learningService.getCourseLearningView(courseId!),
    enabled: !!courseId,
  });

  // Fetch course quizzes safely
  const { data: courseQuizzes = [] } = useQuery<StudentCourseQuizItem[]>({
    queryKey: ["course-quizzes", courseId],
    queryFn: async () => {
      try {
        if (typeof quizService?.listCourseQuizzes === "function") {
          return await quizService.listCourseQuizzes(courseId!);
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!courseId,
  });

  // Flatten lessons across modules
  const allLessons: LearningLesson[] = useMemo(() => {
    if (!learningCourse?.modules) return [];
    return learningCourse.modules.flatMap((m) => m.lessons);
  }, [learningCourse]);

  // Active lesson resolution
  const activeLesson: LearningLesson | null = useMemo(() => {
    if (allLessons.length === 0) return null;
    if (selectedLessonId) {
      const found = allLessons.find((l) => l.id === selectedLessonId);
      if (found) return found;
    }
    const urlLessonId = searchParams.get("lessonId");
    if (urlLessonId) {
      const found = allLessons.find((l) => l.id === urlLessonId);
      if (found) return found;
    }
    try {
      if (courseId) {
        const savedId = localStorage.getItem(`learnova_last_lesson_${courseId}`);
        if (savedId) {
          const found = allLessons.find((l) => l.id === savedId);
          if (found) return found;
        }
      }
    } catch {
      // ignore
    }
    const firstIncomplete = allLessons.find((l) => !l.is_completed);
    return firstIncomplete || allLessons[0];
  }, [allLessons, selectedLessonId, searchParams, courseId]);

  const activeLessonIndex = activeLesson
    ? allLessons.findIndex((l) => l.id === activeLesson.id)
    : 0;

  const previousLesson = activeLessonIndex > 0 ? allLessons[activeLessonIndex - 1] : null;
  const nextLesson =
    activeLessonIndex < allLessons.length - 1 ? allLessons[activeLessonIndex + 1] : null;

  const activeLessonId = activeLesson?.id;
  // Persist active lesson in localStorage
  useEffect(() => {
    if (activeLessonId && courseId) {
      try {
        localStorage.setItem(`learnova_last_lesson_${courseId}`, activeLessonId);
      } catch {
        // ignore
      }
    }
  }, [activeLessonId, courseId]);

  // Mutation to toggle lesson progress
  const progressMutation = useMutation({
    mutationFn: async ({
      lessonId,
      isCompleted,
      playbackPositionSeconds,
      playbackDurationSeconds,
    }: {
      lessonId: string;
      isCompleted?: boolean;
      playbackPositionSeconds?: number;
      playbackDurationSeconds?: number;
    }) => {
      if (!isOnline) {
        enqueueProgress({
          courseId: courseId!,
          lessonId,
          isCompleted,
          playbackPositionSeconds,
          playbackDurationSeconds,
        });
        setPendingOfflineCount(getPendingForCourse(courseId!).length);
        return;
      }

      if (playbackPositionSeconds !== undefined || playbackDurationSeconds !== undefined) {
        return learningService.updateLessonProgress(
          lessonId,
          isCompleted,
          playbackPositionSeconds,
          playbackDurationSeconds
        );
      }
      return learningService.updateLessonProgress(lessonId, isCompleted!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
    },
  });

  const handleToggleComplete = () => {
    if (!activeLesson) return;
    const nextState = !activeLesson.is_completed;
    progressMutation.mutate({
      lessonId: activeLesson.id,
      isCompleted: nextState,
    });
  };

  const handleSaveVideoProgress = (
    pos: number,
    dur: number,
    completedFlag?: boolean
  ) => {
    if (!activeLesson || !courseId) return;
    progressMutation.mutate({
      lessonId: activeLesson.id,
      isCompleted: completedFlag,
      playbackPositionSeconds: pos,
      playbackDurationSeconds: dur,
    });
  };

  const selectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setCurrentSlide(1);
    setModulesDrawerOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("lessonId", lessonId);
      return next;
    }, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextLesson = () => {
    if (nextLesson) {
      selectLesson(nextLesson.id);
    }
  };

  const handlePreviousLesson = () => {
    if (previousLesson) {
      selectLesson(previousLesson.id);
    }
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-center gap-3">
          <Skeleton className="h-9 w-36 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full max-w-3xl mx-auto rounded-2xl" />
        <Skeleton className="h-[480px] w-full max-w-3xl mx-auto rounded-2xl" />
      </div>
    );
  }

  if (isError || !learningCourse) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-destructive/10 border border-destructive/20 rounded-2xl text-center space-y-4 my-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-destructive">Classroom Access Error</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unable to load classroom session."}
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Button variant="outline" onClick={() => navigate("/my-learning")}>
            Back to My Learning
          </Button>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const { progress } = learningCourse;

  // Slides for PPT / PDF lesson
  const lessonSlides: SlideDeckItem[] =
    activeLesson?.slides && activeLesson.slides.length > 0
      ? activeLesson.slides
      : (activeLesson?.metadata_json?.slides as SlideDeckItem[] | undefined) ||
        DEFAULT_FALLBACK_SLIDES;
  const activeSlideData = lessonSlides[currentSlide - 1] || lessonSlides[0];

  const isReading = activeLesson?.content_type === "text";
  const isVideo = activeLesson?.content_type === "video";
  const isSlides = activeLesson?.content_type === "pdf";
  const isExternal = activeLesson?.content_type === "external_resource";

  const activityEyebrow = isVideo
    ? "COURSE · VIDEO SESSION"
    : isSlides
    ? "COURSE · PRESENTATION SLIDES"
    : isExternal
    ? "COURSE · FORUM & RESOURCES"
    : "COURSE · READING ON SCREEN";

  return (
    <div className="min-h-[82vh] space-y-6 max-w-7xl mx-auto pb-10 relative">
      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div
          className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-xl flex items-center justify-between text-xs max-w-4xl mx-auto"
          role="status"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Offline Mode</strong> — Progress is saved locally and will sync automatically
              when connection resumes.
            </span>
          </div>
          {pendingOfflineCount > 0 && (
            <span className="font-semibold bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
              {pendingOfflineCount} queued
            </span>
          )}
        </div>
      )}

      {/* Online Queue Syncing Toast */}
      {isOnline && isSyncing && (
        <div
          className="bg-primary/10 border border-primary/20 text-primary p-2.5 rounded-xl flex items-center justify-between text-xs animate-pulse max-w-4xl mx-auto"
          role="status"
        >
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>Synchronizing offline learning progress with server...</span>
          </div>
        </div>
      )}

      {/* TOP FOCUSED NAVIGATION BAR (Screenshots 1, 4, 6: centered "Course modules" + "Back to course") */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-3">
        {/* Left: Course title breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          <Link
            to={`/courses/${learningCourse.id}`}
            className="font-bold text-slate-800 hover:text-indigo-600 truncate max-w-[200px] sm:max-w-xs transition-colors"
          >
            {learningCourse.title}
          </Link>
          <span className="text-slate-300">/</span>
          <span className="truncate max-w-[160px] text-slate-500">
            Lesson {activeLessonIndex + 1} of {allLessons.length}
          </span>
        </div>

        {/* Center: Course Modules Drawer & Back to Course Pills (Matching Screenshots 1 & 6) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setModulesDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer"
          >
            <Menu className="w-3.5 h-3.5 text-slate-500" />
            <span>Course modules</span>
          </button>

          <Link
            to={`/courses/${learningCourse.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Back to course</span>
          </Link>
        </div>

        {/* Right: Course Completion Summary (Kept for progress telemetry & test assertions) */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-bold text-slate-800 block leading-none">
              {progress.progress_percentage}% Completed
            </span>
            <span className="text-[10px] text-slate-500">
              {progress.completed_lessons} of {progress.total_lessons} lessons
            </span>
          </div>
          <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progress.progress_percentage >= 100 ? "bg-emerald-500" : "bg-[#E59819]"
              }`}
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* MAIN FOCUS WORKSPACE */}
      {activeLesson ? (
        <div className="space-y-6">
          {/* ACTIVITY HEADER CARD (Screenshots 1 & 6) */}
          <div className="max-w-3xl mx-auto space-y-2.5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                  {isVideo ? (
                    <Video className="w-5 h-5 text-purple-600" />
                  ) : isSlides ? (
                    <Presentation className="w-5 h-5 text-indigo-600" />
                  ) : isExternal ? (
                    <MessageSquare className="w-5 h-5 text-rose-500" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-[#063B50]" />
                  )}
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {activityEyebrow}
                    {activeLesson.duration_minutes > 0 ? ` · ${activeLesson.duration_minutes}m` : ""}
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                    {activeLesson.title}
                  </h2>
                </div>
              </div>

              <div className="shrink-0">
                <Button
                  onClick={handleToggleComplete}
                  disabled={progressMutation.isPending}
                  variant={activeLesson.is_completed ? "outline" : "primary"}
                  size="sm"
                  className={`gap-1.5 text-xs font-bold rounded-xl ${
                    activeLesson.is_completed
                      ? "border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70"
                      : "bg-[#063B50] hover:bg-[#052E40] text-white"
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  {activeLesson.is_completed ? "Mark as Incomplete" : "Mark as Complete"}
                </Button>
              </div>
            </div>

            {/* Completion Criterion Green Pills (Screenshots 1 & 6) */}
            <div className="flex flex-wrap items-center justify-end gap-2 px-1">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                  activeLesson.is_completed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-white border-slate-200 text-slate-500"
                }`}
              >
                <Check className="w-3 h-3" />
                <span>{activeLesson.is_completed ? "Done: View" : "To do: View"}</span>
              </span>

              {(isReading || isSlides) && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    activeLesson.is_completed
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-500"
                  }`}
                >
                  <Check className="w-3 h-3" />
                  <span>
                    {activeLesson.is_completed
                      ? "Done: Go through the activity to the end"
                      : "To do: Go through the activity to the end"}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* LEFT AI FEATURES PILL & CENTERED CONTENT CARD GRID (Screenshots 1, 2, 6) */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Floating AI Features Pill (Screenshots 1, 3, 6) */}
            <div className="lg:col-span-3 flex lg:justify-start justify-center lg:sticky lg:top-8 z-20">
              <div className="relative">
                <div className="inline-flex items-center rounded-xl bg-white border border-slate-200 hover:border-indigo-300 shadow-xs overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAiTutorOpen((v) => !v)}
                    data-testid="toggle-ai-tutor-btn"
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-indigo-700 hover:bg-indigo-50/50 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>AI features</span>
                  </button>
                  <button
                    type="button"
                    aria-label="More AI options"
                    onClick={() => setAiDropdownOpen(!aiDropdownOpen)}
                    className="px-2 py-2 border-l border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {aiDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl border border-slate-200 shadow-xl p-1.5 z-30 space-y-1 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAiDropdownOpen(false);
                        setAiTutorOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 text-slate-800 font-semibold flex items-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ask AI Tutor about this lesson</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAiDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent("open-ai-copilot"));
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                      <span>Open Global RAG Study Copilot</span>
                    </button>
                  </div>
                )}

                {/* Side section heading in Reading view matching Screenshot 1 */}
                {isReading && (
                  <div className="hidden lg:block mt-6 pr-4">
                    <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {activeLesson.title}
                    </h3>
                    {activeLesson.description && (
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                        {activeLesson.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Center Focused Content Card (6-8 cols) */}
            <div className="lg:col-span-8 max-w-3xl w-full mx-auto lg:mx-0">
              {/* TYPE 1: READING ON SCREEN (Screenshots 1 & 2) */}
              {isReading && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-8">
                  {activeLesson.text_content ? (
                    <FormattedLessonProse text={activeLesson.text_content} />
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No instructional text written for this lesson yet.
                    </p>
                  )}

                  {/* Inside-card Bottom-right Amber "Next" Button (Screenshot 2) */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                    {nextLesson && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeLesson.is_completed) {
                            progressMutation.mutate({
                              lessonId: activeLesson.id,
                              isCompleted: true,
                            });
                          }
                          handleNextLesson();
                        }}
                        className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg shadow-xs transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TYPE 2: VIDEO LECTURE PLAYER (Screenshot 6) */}
              {isVideo && (
                <div className="space-y-3">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 overflow-hidden">
                    <VideoLessonPlayer
                      key={activeLesson.id}
                      lessonId={activeLesson.id}
                      courseId={courseId!}
                      title={activeLesson.title}
                      resourceUrl={activeLesson.resource_url}
                      initialPositionSeconds={activeLesson.playback_position_seconds || 0}
                      initialDurationSeconds={activeLesson.playback_duration_seconds || 0}
                      isCompleted={activeLesson.is_completed}
                      onSaveProgress={handleSaveVideoProgress}
                      onMarkComplete={handleToggleComplete}
                      isOffline={!isOnline}
                    />
                  </div>
                  <p className="text-center text-[11px] text-slate-400">
                    Session updated · {activeLesson.duration_minutes} mins recorded lecture
                  </p>
                </div>
              )}

              {/* TYPE 3: PRESENTATION SLIDES (Interactive PPT Deck) */}
              {isSlides && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Dark Deck Player Header */}
                  <div className="bg-[#063B50] text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E59819] text-slate-950 flex items-center justify-center font-extrabold text-xs">
                        PPT
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{activeLesson.title}</h4>
                        <p className="text-[10px] text-sky-200/80">
                          Interactive Presentation Deck · {lessonSlides.length} Slides
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentSlide((s) => Math.max(1, s - 1))}
                        disabled={currentSlide <= 1}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        ‹ Prev
                      </button>
                      <span className="text-xs font-mono font-bold px-2">
                        Slide {currentSlide} / {lessonSlides.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCurrentSlide((s) => Math.min(lessonSlides.length, s + 1))}
                        disabled={currentSlide >= lessonSlides.length}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>

                  {/* Interactive Slide Canvas */}
                  <div className="p-6 sm:p-10 bg-gradient-to-br from-slate-50 to-sky-50/40 min-h-[340px] flex flex-col justify-between m-4 rounded-xl border border-slate-200">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#063B50]">
                          SLIDE {activeSlideData.slide_number} OF {lessonSlides.length}
                        </span>
                        <span className="text-xs font-mono text-slate-400">Learnova Slide Engine</span>
                      </div>

                      <h3 className="text-xl font-extrabold text-slate-900">
                        {activeSlideData.title}
                      </h3>

                      <p className="text-sm text-slate-700 leading-relaxed">
                        {activeSlideData.content}
                      </p>

                      {activeSlideData.key_takeaways && activeSlideData.key_takeaways.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200/80 p-4 space-y-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                            Key Takeaways
                          </span>
                          <ul className="space-y-1.5 text-xs text-slate-700 list-disc list-inside leading-relaxed">
                            {activeSlideData.key_takeaways.map((kt, idx) => (
                              <li key={idx}>{kt}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] text-slate-500 font-medium">
                        {activeLesson.presentation_notes || activeLesson.title}
                      </span>
                      {activeLesson.resource_url && (
                        <a
                          href={activeLesson.resource_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#063B50] hover:text-indigo-700 underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Source PDF / Slides</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TYPE 4: EXTERNAL RESOURCE / FORUM */}
              {isExternal && (
                <div className="rounded-2xl border border-slate-200 p-8 sm:p-10 bg-white shadow-sm text-center space-y-4">
                  <div className="h-14 w-14 rounded-full bg-rose-50 text-rose-500 border border-rose-100 mx-auto flex items-center justify-center">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-base text-slate-900">{activeLesson.title}</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      {activeLesson.description ||
                        "Access companion documentation, sandbox labs, and cohort forum discussions."}
                    </p>
                  </div>
                  {activeLesson.resource_url && (
                    <a
                      href={activeLesson.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block pt-2"
                    >
                      <Button className="bg-[#063B50] hover:bg-[#052E40] text-white gap-2 text-xs font-bold">
                        <ExternalLink className="h-4 w-4" />
                        Visit External Resource
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM CORNER PREVIOUS / NEXT NAVIGATION CARDS (Screenshots 2, 3, 4, 6) */}
          <div className="pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePreviousLesson}
              disabled={!previousLesson}
              aria-label="Previous Lesson"
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-40 disabled:pointer-events-none transition-all text-left cursor-pointer max-w-xs"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                  PREVIOUS <span className="sr-only">Lesson</span>
                </span>
                <span className="text-xs font-bold text-slate-800 truncate block">
                  {previousLesson ? previousLesson.title : "Start of Curriculum"}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-3 justify-end">
              {!activeLesson.is_completed && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleToggleComplete();
                    if (nextLesson) handleNextLesson();
                  }}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-4 rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Complete &amp; Continue</span>
                </Button>
              )}

              <button
                type="button"
                onClick={handleNextLesson}
                disabled={!nextLesson}
                aria-label="Next Lesson"
                className="group flex items-center justify-end gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs disabled:opacity-40 disabled:pointer-events-none transition-all text-right cursor-pointer max-w-xs"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                    NEXT <span className="sr-only">Lesson</span>
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {nextLesson ? nextLesson.title : "End of Lessons"}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 shrink-0" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 max-w-2xl mx-auto">
          <Sparkles className="h-8 w-8 text-indigo-500 mx-auto" />
          <p className="text-sm text-slate-500">No lessons available in this course curriculum.</p>
        </div>
      )}

      {/* SLIDE-OVER COURSE MODULES DRAWER (Triggered by "[☰ Course modules]" button) */}
      {modulesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setModulesDrawerOpen(false)}
          />
          <aside className="relative z-10 w-full max-w-sm bg-white h-full shadow-2xl border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-[#063B50] text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">Course Modules</span>
              </div>
              <button
                type="button"
                onClick={() => setModulesDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {learningCourse.modules.map((mod, modIdx) => {
                const isCollapsed = !!collapsedModules[mod.id];
                const modPct =
                  mod.total_lessons_count > 0
                    ? Math.round((mod.completed_lessons_count / mod.total_lessons_count) * 100)
                    : 0;
                return (
                  <div key={mod.id} className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleModuleCollapse(mod.id)}
                      className="w-full p-3 bg-slate-50 flex items-center justify-between gap-2 text-left text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">
                          Module {modIdx + 1}: {mod.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                        {mod.completed_lessons_count}/{mod.total_lessons_count}
                      </span>
                    </button>

                    <div className="h-1 bg-slate-100 w-full">
                      <div
                        className={`h-full ${modPct === 100 ? "bg-emerald-500" : "bg-[#E59819]"}`}
                        style={{ width: `${modPct}%` }}
                      />
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-slate-100">
                        {mod.lessons.map((les) => {
                          const isActive = les.id === activeLesson?.id;
                          return (
                            <button
                              key={les.id}
                              type="button"
                              onClick={() => selectLesson(les.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-indigo-50 text-indigo-700 font-bold"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {les.is_completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                )}
                                <span className="truncate">{les.title}</span>
                              </div>
                              {les.duration_minutes > 0 && (
                                <span className="text-[10px] text-slate-400 shrink-0">
                                  {les.duration_minutes}m
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Quizzes inside drawer */}
              {courseQuizzes.length > 0 && (
                <div className="pt-2 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 block">
                    Assessments ({courseQuizzes.length})
                  </span>
                  {courseQuizzes.map((q) => (
                    <Link
                      key={q.id}
                      to={`/learning/quizzes/${q.id}`}
                      onClick={() => setModulesDrawerOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-semibold text-slate-800 truncate">{q.title}</span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-700 shrink-0">
                        {q.question_count} Qs
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Docked AI Tutor Drawer */}
      {aiTutorOpen && (
        <div
          className="fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 p-3 sm:p-4 bg-background/95 backdrop-blur-md shadow-2xl flex flex-col border-l border-border"
          data-testid="classroom-ai-tutor-drawer"
        >
          <div className="h-full flex flex-col">
            <AITutorPanel
              courseId={courseId!}
              activeLessonId={activeLesson?.id}
              courseTitle={learningCourse.title}
              activeLessonTitle={activeLesson?.title}
              onNavigateLesson={(lessonId) => selectLesson(lessonId)}
              onClose={() => setAiTutorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Lesson AI Tutor Button */}
      {!aiTutorOpen && (
        <button
          type="button"
          onClick={() => setAiTutorOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-[#063B50] text-white hover:bg-[#052E40] shadow-xl rounded-full px-4 py-2.5 flex items-center gap-2 font-bold text-xs transition-transform hover:scale-105 cursor-pointer border border-[#144E6D]/60"
          data-testid="floating-ai-tutor-btn"
          title="Open Lesson AI Tutor"
        >
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Ask AI Tutor</span>
        </button>
      )}
    </div>
  );
}

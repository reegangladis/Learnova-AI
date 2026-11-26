import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  ExternalLink,
  Lightbulb,
  Maximize2,
  Menu,
  MessageSquare,
  Minimize2,
  Presentation,
  RefreshCw,
  Sparkles,
  StickyNote,
  Video,
  WifiOff,
  X,
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
  const clean = text.replace(/<\/?(p|div)>/g, "").trim();
  const tokens = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-foreground">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-secondary border border-border font-mono text-[11px] text-teal-700 dark:text-teal-300"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{tok}</span>;
  });
}

function FormattedLessonProse({
  text,
  fontScale,
}: {
  text: string;
  fontScale: "sm" | "md" | "lg";
}) {
  const normalized = text
    .replace(/<h3>/gi, "\n### ")
    .replace(/<\/h3>/gi, "\n")
    .replace(/<h4>/gi, "\n#### ")
    .replace(/<\/h4>/gi, "\n")
    .replace(/<\/?p>/gi, "\n")
    .replace(/<li>/gi, "\n- ")
    .replace(/<\/li>|<\/?ul>|<\/?ol>/gi, "\n");

  const blocks = normalized.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  const proseSizeClass =
    fontScale === "lg" ? "text-base" : fontScale === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={`space-y-4 ${proseSizeClass} text-foreground/90 leading-relaxed`}>
      {blocks.map((block, bIdx) => {
        const lines = block
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length === 1 && lines[0].startsWith("### ")) {
          return (
            <h3 key={bIdx} className="font-display text-base sm:text-lg font-bold text-foreground pt-2">
              {lines[0].replace(/^###\s+/, "")}
            </h3>
          );
        }
        if (lines.length === 1 && lines[0].startsWith("#### ")) {
          return (
            <h4 key={bIdx} className="font-display text-sm sm:text-base font-bold text-foreground pt-1">
              {lines[0].replace(/^####\s+/, "")}
            </h4>
          );
        }

        const elements: React.ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (listItems.length > 0) {
            elements.push(
              <ul key={`${keyPrefix}-ul`} className="space-y-2 pl-5 list-disc text-foreground/90">
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
              <h3
                key={`${bIdx}-${lIdx}-h3`}
                className="font-display text-base sm:text-lg font-bold text-foreground pt-2"
              >
                {line.replace(/^###\s+/, "")}
              </h3>
            );
          } else if (line.startsWith("#### ")) {
            flushList(`${bIdx}-${lIdx}`);
            elements.push(
              <h4
                key={`${bIdx}-${lIdx}-h4`}
                className="font-display text-sm sm:text-base font-bold text-foreground pt-1"
              >
                {line.replace(/^####\s+/, "")}
              </h4>
            );
          } else if (line.startsWith("- ") || line.startsWith("• ")) {
            listItems.push(line.replace(/^[-•]\s+/, ""));
          } else {
            flushList(`${bIdx}-${lIdx}`);
            elements.push(
              <p key={`${bIdx}-${lIdx}-p`} className="leading-relaxed text-foreground/90 whitespace-pre-wrap">
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
    content:
      "Modular abstraction boundaries, stateless service contracts, and declarative orchestration.",
    key_takeaways: [
      "Separate control plane logic from data plane throughput",
      "Enforce immutable build artifacts across environments",
    ],
  },
  {
    slide_number: 2,
    title: "2. Scalability & High-Availability Patterns",
    content:
      "Horizontal auto-scaling, health probes, and graceful load shedding under peak demand.",
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
    content:
      "Continuous integration validation combining unit specs, contract schemas, and CVE scans.",
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
  const [fontScale, setFontScale] = useState<"sm" | "md" | "lg">("md");
  const [zenMode, setZenMode] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [flashcardRevealed, setFlashcardRevealed] = useState(false);
  const [lessonNote, setLessonNote] = useState("");
  const [checkedTakeaways, setCheckedTakeaways] = useState<Record<string, boolean>>({});
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const paramLessonId = searchParams.get("lessonId");
    if (paramLessonId && paramLessonId !== selectedLessonId) {
      setSelectedLessonId(paramLessonId);
      setCurrentSlide(1);
      setFlashcardRevealed(false);
    }
  }, [searchParams, selectedLessonId]);

  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(() =>
    courseId ? getPendingForCourse(courseId).length : 0
  );

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
      // Retain items in queue
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

  const allLessons: LearningLesson[] = useMemo(() => {
    if (!learningCourse?.modules) return [];
    return learningCourse.modules.flatMap((m) => m.lessons);
  }, [learningCourse]);

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
  useEffect(() => {
    if (activeLessonId && courseId) {
      try {
        localStorage.setItem(`learnova_last_lesson_${courseId}`, activeLessonId);
        const savedNote = localStorage.getItem(`learnova_note_${activeLessonId}`) || "";
        setLessonNote(savedNote);
      } catch {
        // ignore
      }
    }
  }, [activeLessonId, courseId]);

  const handleSaveNote = (val: string) => {
    setLessonNote(val);
    if (activeLessonId) {
      try {
        localStorage.setItem(`learnova_note_${activeLessonId}`, val);
      } catch {
        // ignore
      }
    }
  };

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
    setFlashcardRevealed(false);
    setModulesDrawerOpen(false);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("lessonId", lessonId);
        return next;
      },
      { replace: true }
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNextLesson = () => {
    if (nextLesson) selectLesson(nextLesson.id);
  };

  const handlePreviousLesson = () => {
    if (previousLesson) selectLesson(previousLesson.id);
  };

  const toggleModuleCollapse = (moduleId: string) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const lessonSlides: SlideDeckItem[] = useMemo(() => {
    if (!activeLesson) return DEFAULT_FALLBACK_SLIDES;
    if (activeLesson.slides && activeLesson.slides.length > 0) return activeLesson.slides;
    return (
      (activeLesson.metadata_json?.slides as SlideDeckItem[] | undefined) ||
      DEFAULT_FALLBACK_SLIDES
    );
  }, [activeLesson]);

  // Keyboard shortcuts for Slide Deck navigation (Left/Right arrows)
  useEffect(() => {
    if (activeLesson?.content_type !== "pdf") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        setCurrentSlide((s) => Math.min(lessonSlides.length, s + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentSlide((s) => Math.max(1, s - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeLesson?.content_type, lessonSlides.length]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between gap-3">
          <Skeleton className="h-9 w-48 rounded-xl" />
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-[460px] w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !learningCourse) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-center space-y-4 my-12">
        <AlertCircle className="h-10 w-10 text-rose-600 mx-auto" />
        <h2 className="font-display text-xl font-bold text-foreground">Classroom Access Error</h2>
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
  const activeSlideData = lessonSlides[currentSlide - 1] || lessonSlides[0];

  const isReading = activeLesson?.content_type === "text";
  const isVideo = activeLesson?.content_type === "video";
  const isSlides = activeLesson?.content_type === "pdf";
  const isExternal = activeLesson?.content_type === "external_resource";

  const activityEyebrow = isVideo
    ? "STUDIO · VIDEO WORKSHOP"
    : isSlides
    ? "STUDIO · INTERACTIVE SLIDE DECK"
    : isExternal
    ? "STUDIO · LAB & RESOURCES"
    : "STUDIO · INTERACTIVE READING";

  return (
    <div className="min-h-[82vh] space-y-5 max-w-7xl mx-auto pb-12 relative">
      {/* Offline Banner */}
      {!isOnline && (
        <div
          className="bg-orange-500/10 border border-orange-500/25 text-orange-700 dark:text-orange-300 p-3 rounded-xl flex items-center justify-between text-xs"
          role="status"
        >
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>
              <strong>Offline Mode</strong> — Progress is queued locally and will sync automatically.
            </span>
          </div>
          {pendingOfflineCount > 0 && (
            <span className="font-mono font-bold bg-orange-500/20 px-2 py-0.5 rounded-full">
              {pendingOfflineCount} queued
            </span>
          )}
        </div>
      )}

      {isOnline && isSyncing && (
        <div
          className="bg-teal-500/10 border border-teal-500/25 text-teal-700 dark:text-teal-300 p-2.5 rounded-xl flex items-center gap-2 text-xs animate-pulse"
          role="status"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          <span>Synchronizing offline learning progress...</span>
        </div>
      )}

      {/* TOP STUDIO TOOLBAR */}
      <div className="studio-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setModulesDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 text-xs font-bold text-foreground cursor-pointer transition-colors"
          >
            <Menu className="w-3.5 h-3.5 text-teal-600" />
            <span>Course modules</span>
          </button>

          <Link
            to={`/courses/${learningCourse.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to course</span>
          </Link>

          <span className="hidden md:inline text-border">|</span>
          <Link
            to={`/courses/${learningCourse.id}`}
            className="hidden md:inline font-display font-bold text-xs text-foreground truncate max-w-[240px]"
          >
            {learningCourse.title}
          </Link>
        </div>

        {/* Interactive Studio Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isReading && (
            <div className="hidden sm:inline-flex items-center p-0.5 rounded-lg bg-secondary border border-border text-[11px] font-mono">
              {(["sm", "md", "lg"] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setFontScale(sz)}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    fontScale === sz ? "bg-card text-foreground font-bold shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {sz === "sm" ? "A-" : sz === "md" ? "A" : "A+"}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => setNotesOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              notesOpen
                ? "bg-orange-500/15 border-orange-500/30 text-orange-700 dark:text-orange-300"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>

          <button
            type="button"
            onClick={() => setZenMode((v) => !v)}
            title={zenMode ? "Exit Zen Mode" : "Zen Focus Mode"}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {zenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{zenMode ? "Exit Zen" : "Zen"}</span>
          </button>

          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="text-right">
              <span className="font-mono text-xs font-bold text-foreground block leading-none">
                {progress.progress_percentage}% Completed
              </span>
              <span className="text-[10px] text-muted-foreground">
                {progress.completed_lessons} of {progress.total_lessons} lessons
              </span>
            </div>
            <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full transition-all ${
                  progress.progress_percentage >= 100 ? "bg-emerald-500" : "bg-teal-600"
                }`}
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MAIN FOCUS WORKSPACE */}
      {activeLesson ? (
        <div className="space-y-5">
          {/* Activity Header Deck */}
          <div className="studio-card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-teal-600">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0">
                {isVideo ? (
                  <Video className="w-5 h-5" />
                ) : isSlides ? (
                  <Presentation className="w-5 h-5" />
                ) : isExternal ? (
                  <MessageSquare className="w-5 h-5" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-muted-foreground block">
                  {activityEyebrow} · Lesson {activeLessonIndex + 1}/{allLessons.length}
                  {activeLesson.duration_minutes > 0 ? ` · ${activeLesson.duration_minutes}m` : ""}
                </span>
                <h2 className="font-display text-base sm:text-lg font-bold text-foreground truncate">
                  {activeLesson.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  activeLesson.is_completed
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                    : "bg-secondary border-border text-muted-foreground"
                }`}
              >
                <Check className="w-3 h-3" />
                {activeLesson.is_completed ? "Completed" : "In Progress"}
              </span>

              <Button
                onClick={handleToggleComplete}
                disabled={progressMutation.isPending}
                variant={activeLesson.is_completed ? "outline" : "primary"}
                size="sm"
                className={`gap-1.5 text-xs font-bold rounded-xl ${
                  activeLesson.is_completed
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "bg-teal-600 hover:bg-teal-700 text-white"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
                {activeLesson.is_completed ? "Mark as Incomplete" : "Mark as Complete"}
              </Button>
            </div>
          </div>

          {/* WORKBENCH BODY */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT COMPANION COLUMN (AI Features & Lesson Context - hidden in Zen Mode) */}
            {!zenMode && (
              <div className="lg:col-span-3 space-y-4 lg:sticky lg:top-20">
                <div className="studio-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase font-bold text-teal-700 dark:text-teal-400">
                      AI Companion
                    </span>
                    <button
                      type="button"
                      aria-label="More AI options"
                      onClick={() => setAiDropdownOpen(!aiDropdownOpen)}
                      className="p-1 rounded-lg hover:bg-secondary text-muted-foreground cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setAiTutorOpen((v) => !v)}
                    data-testid="toggle-ai-tutor-btn"
                    className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-[0_2px_0_0_#0f766e] transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI features</span>
                  </button>

                  {aiDropdownOpen && (
                    <div className="p-1.5 rounded-xl bg-secondary border border-border space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setAiDropdownOpen(false);
                          setAiTutorOpen(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-card text-foreground font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                        <span>Open Lesson Tutor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAiDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent("open-ai-copilot"));
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-card text-foreground font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                        <span>Cross-Course RAG</span>
                      </button>
                    </div>
                  )}

                  {activeLesson.description && (
                    <div className="pt-2 border-t border-border text-xs text-muted-foreground leading-relaxed">
                      <span className="font-bold text-foreground block mb-1">Lesson Brief</span>
                      {activeLesson.description}
                    </div>
                  )}
                </div>

                {/* Inline Quick Notes Card when toggled */}
                {notesOpen && (
                  <div className="studio-card p-4 space-y-2 border-orange-500/30 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <StickyNote className="w-3.5 h-3.5 text-orange-500" />
                        Study Scratchpad
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground">Auto-saved</span>
                    </div>
                    <textarea
                      rows={5}
                      value={lessonNote}
                      onChange={(e) => handleSaveNote(e.target.value)}
                      placeholder="Jot down commands, key takeaways, or exam questions for this lesson..."
                      className="w-full rounded-xl border border-input bg-background p-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                    />
                  </div>
                )}
              </div>
            )}

            {/* CENTER INTERACTIVE CONTENT CANVAS */}
            <div className={zenMode ? "lg:col-span-12 max-w-4xl mx-auto w-full" : "lg:col-span-9 w-full"}>
              {/* TYPE 1: READING ON SCREEN */}
              {isReading && (
                <div className="studio-card p-6 sm:p-10 space-y-8">
                  {activeLesson.text_content ? (
                    <FormattedLessonProse text={activeLesson.text_content} fontScale={fontScale} />
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No instructional text written for this lesson yet.
                    </p>
                  )}

                  {/* Interactive Key Concept Flashcard Reveal */}
                  <div className="p-4 rounded-2xl bg-secondary/50 border border-border space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-orange-500" />
                        Active Recall Check: Why does &ldquo;{activeLesson.title}&rdquo; matter in production?
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFlashcardRevealed((v) => !v)}
                        className="text-xs h-7 rounded-lg shrink-0"
                      >
                        {flashcardRevealed ? "Hide Summary" : "Reveal Key Takeaway"}
                      </Button>
                    </div>
                    {flashcardRevealed && (
                      <p className="text-xs text-foreground/90 bg-card p-3 rounded-xl border border-border animate-fade-in leading-relaxed">
                        Mastering this unit directly reinforces fault isolation, predictable latency,
                        and repeatable engineering workflows covered in this module&apos;s quiz and RAG
                        index.
                      </p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
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
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-[0_2px_0_0_#0f766e] transition-all cursor-pointer"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* TYPE 2: VIDEO LECTURE PLAYER */}
              {isVideo && (
                <div className="space-y-3">
                  <div className="studio-card p-3 sm:p-5 overflow-hidden">
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
                  <p className="text-center text-[11px] font-mono text-muted-foreground">
                    Studio Cinema Player · {activeLesson.duration_minutes} mins recorded session
                  </p>
                </div>
              )}

              {/* TYPE 3: INTERACTIVE SLIDE STUDIO DECK */}
              {isSlides && (
                <div className="studio-card overflow-hidden">
                  {/* Dark Studio Bezel Header */}
                  <div className="bg-foreground text-background px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-mono font-bold text-xs">
                        PPT
                      </div>
                      <div>
                        <h4 className="font-display text-xs sm:text-sm font-bold">
                          {activeLesson.title}
                        </h4>
                        <p className="text-[10px] font-mono opacity-75">
                          Slide Studio · Use ← / → keys · {lessonSlides.length} Slides
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentSlide((s) => Math.max(1, s - 1))}
                        disabled={currentSlide <= 1}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-background/15 hover:bg-background/25 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        ‹ Prev
                      </button>
                      <span className="text-xs font-mono font-bold px-2">
                        {currentSlide} / {lessonSlides.length}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentSlide((s) => Math.min(lessonSlides.length, s + 1))
                        }
                        disabled={currentSlide >= lessonSlides.length}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-background/15 hover:bg-background/25 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Next ›
                      </button>
                    </div>
                  </div>

                  {/* Interactive Slide Canvas */}
                  <div className="p-6 sm:p-10 bg-secondary/35 min-h-[340px] flex flex-col justify-between m-4 rounded-2xl border border-border">
                    <div className="space-y-5">
                      <div className="flex items-center justify-between border-b border-border pb-3">
                        <span className="text-[11px] font-mono uppercase font-bold tracking-widest text-teal-700 dark:text-teal-400">
                          SLIDE {activeSlideData.slide_number} OF {lessonSlides.length}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground">
                          Learnova Slide Studio
                        </span>
                      </div>

                      <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                        {activeSlideData.title}
                      </h3>

                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {activeSlideData.content}
                      </p>

                      {activeSlideData.key_takeaways && activeSlideData.key_takeaways.length > 0 && (
                        <div className="bg-card rounded-xl border border-border p-4 space-y-2.5">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                            Interactive Study Checklist
                          </span>
                          <div className="space-y-2">
                            {activeSlideData.key_takeaways.map((kt, idx) => {
                              const kKey = `${activeLesson.id}-${activeSlideData.slide_number}-${idx}`;
                              const checked = !!checkedTakeaways[kKey];
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setCheckedTakeaways((prev) => ({
                                      ...prev,
                                      [kKey]: !prev[kKey],
                                    }))
                                  }
                                  className="w-full text-left flex items-start gap-2.5 text-xs text-foreground cursor-pointer group"
                                >
                                  <span
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                                      checked
                                        ? "bg-teal-600 border-teal-600 text-white"
                                        : "border-border bg-background"
                                    }`}
                                  >
                                    {checked && <Check className="w-3 h-3" />}
                                  </span>
                                  <span className={checked ? "line-through opacity-60" : ""}>
                                    {kt}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-5 mt-5 border-t border-border flex flex-wrap items-center justify-between gap-3">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {activeLesson.presentation_notes || activeLesson.title}
                      </span>
                      {activeLesson.resource_url && (
                        <a
                          href={activeLesson.resource_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Source PDF / Slides</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Clickable Thumbnail Filmstrip */}
                  <div className="px-4 pb-4 flex items-center gap-2 overflow-x-auto">
                    {lessonSlides.map((sl) => {
                      const active = sl.slide_number === currentSlide;
                      return (
                        <button
                          key={sl.slide_number}
                          type="button"
                          onClick={() => setCurrentSlide(sl.slide_number)}
                          className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all cursor-pointer w-36 ${
                            active
                              ? "bg-teal-500/12 border-teal-600 text-foreground"
                              : "bg-secondary/50 border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="text-[10px] font-mono font-bold block">
                            Slide 0{sl.slide_number}
                          </span>
                          <span className="text-[11px] font-semibold truncate block">
                            {sl.title.replace(/^\d+\.\s*/, "")}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TYPE 4: EXTERNAL RESOURCE / FORUM */}
              {isExternal && (
                <div className="studio-card p-8 sm:p-10 text-center space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-orange-500/10 text-orange-600 border border-orange-500/20 mx-auto flex items-center justify-center">
                    <ExternalLink className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-base text-foreground">
                      {activeLesson.title}
                    </h4>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                      {activeLesson.description ||
                        "Access companion documentation, sandbox labs, and cohort discussions."}
                    </p>
                  </div>
                  {activeLesson.resource_url && (
                    <a
                      href={activeLesson.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block pt-2"
                    >
                      <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 text-xs font-bold rounded-xl">
                        <ExternalLink className="h-4 w-4" />
                        Visit External Resource
                      </Button>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM PREVIOUS / NEXT NAVIGATION BAR */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePreviousLesson}
              disabled={!previousLesson}
              aria-label="Previous Lesson"
              className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-teal-500/40 disabled:opacity-40 disabled:pointer-events-none transition-all text-left cursor-pointer max-w-xs"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              <div className="min-w-0">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                  PREVIOUS <span className="sr-only">Lesson</span>
                </span>
                <span className="text-xs font-bold text-foreground truncate block">
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
                className="group flex items-center justify-end gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-teal-500/40 disabled:opacity-40 disabled:pointer-events-none transition-all text-right cursor-pointer max-w-xs"
              >
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground block">
                    NEXT <span className="sr-only">Lesson</span>
                  </span>
                  <span className="text-xs font-bold text-foreground truncate block">
                    {nextLesson ? nextLesson.title : "End of Lessons"}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground shrink-0" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="studio-card p-12 text-center space-y-3 max-w-2xl mx-auto">
          <Sparkles className="h-8 w-8 text-teal-600 mx-auto" />
          <p className="text-sm text-muted-foreground">No lessons available in this course curriculum.</p>
        </div>
      )}

      {/* SLIDE-OVER COURSE MODULES DRAWER */}
      {modulesDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs"
            onClick={() => setModulesDrawerOpen(false)}
          />
          <aside className="relative z-10 w-full max-w-sm bg-card text-foreground h-full shadow-2xl border-r border-border flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between bg-secondary/60">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-teal-600" />
                <span className="font-display font-bold text-sm">Course Modules</span>
              </div>
              <button
                type="button"
                onClick={() => setModulesDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
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
                  <div key={mod.id} className="border border-border rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleModuleCollapse(mod.id)}
                      className="w-full p-3 bg-secondary/40 flex items-center justify-between gap-2 text-left text-xs font-bold text-foreground cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        )}
                        <span className="truncate">
                          Module {modIdx + 1}: {mod.title}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-muted-foreground shrink-0">
                        {mod.completed_lessons_count}/{mod.total_lessons_count}
                      </span>
                    </button>

                    <div className="h-1 bg-secondary w-full">
                      <div
                        className={`h-full ${modPct === 100 ? "bg-emerald-500" : "bg-teal-600"}`}
                        style={{ width: `${modPct}%` }}
                      />
                    </div>

                    {!isCollapsed && (
                      <div className="divide-y divide-border">
                        {mod.lessons.map((les) => {
                          const isActive = les.id === activeLesson?.id;
                          return (
                            <button
                              key={les.id}
                              type="button"
                              onClick={() => selectLesson(les.id)}
                              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                                isActive
                                  ? "bg-teal-500/12 text-teal-700 dark:text-teal-300 font-bold"
                                  : "hover:bg-secondary/50 text-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {les.is_completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                                )}
                                <span className="truncate">{les.title}</span>
                              </div>
                              {les.duration_minutes > 0 && (
                                <span className="text-[10px] font-mono text-muted-foreground shrink-0">
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

              {courseQuizzes.length > 0 && (
                <div className="pt-2 space-y-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground px-1 block">
                    Assessments ({courseQuizzes.length})
                  </span>
                  {courseQuizzes.map((q) => (
                    <Link
                      key={q.id}
                      to={`/learning/quizzes/${q.id}`}
                      onClick={() => setModulesDrawerOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl border border-orange-500/25 bg-orange-500/10 hover:bg-orange-500/15 text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckSquare className="w-4 h-4 text-orange-500 shrink-0" />
                        <span className="font-semibold text-foreground truncate">{q.title}</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-orange-600 dark:text-orange-400 shrink-0">
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
          className="fixed bottom-6 right-6 z-40 bg-teal-600 hover:bg-teal-700 text-white shadow-xl rounded-full px-4 py-2.5 flex items-center gap-2 font-bold text-xs transition-transform hover:scale-105 cursor-pointer border border-teal-400/40"
          data-testid="floating-ai-tutor-btn"
          title="Open Lesson AI Tutor"
        >
          <Sparkles className="h-4 w-4 text-teal-100" />
          <span>Ask AI Tutor</span>
        </button>
      )}
    </div>
  );
}

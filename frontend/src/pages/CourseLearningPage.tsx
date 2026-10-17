import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Video,
  FileText,
  ExternalLink,
  Clock,
  Sparkles,
  AlertCircle,
  Menu,
  X,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { learningService } from "@/services/learningService";
import { quizService } from "@/services/quizService";
import { AITutorPanel } from "@/components/ai/AITutorPanel";
import { LearningLesson } from "@/types/learning";
import { StudentCourseQuizItem } from "@/types/quiz";

export function CourseLearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiTutorOpen, setAiTutorOpen] = useState(false);

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

  // Fetch course quizzes
  const { data: courseQuizzes = [] } = useQuery<StudentCourseQuizItem[]>({
    queryKey: ["course-quizzes", courseId],
    queryFn: () => quizService.listCourseQuizzes(courseId!),
    enabled: !!courseId,
  });

  // Flatten lessons in sequence across all modules
  const allLessons: LearningLesson[] = React.useMemo(() => {
    if (!learningCourse?.modules) return [];
    return learningCourse.modules.flatMap((m) => m.lessons);
  }, [learningCourse]);

  // Purely derived active lesson without cascading setState in an effect
  const activeLesson: LearningLesson | null = React.useMemo(() => {
    if (allLessons.length === 0) return null;
    if (selectedLessonId) {
      const found = allLessons.find((l) => l.id === selectedLessonId);
      if (found) return found;
    }
    const firstIncomplete = allLessons.find((l) => !l.is_completed);
    return firstIncomplete || allLessons[0];
  }, [allLessons, selectedLessonId]);

  const activeLessonIndex = activeLesson
    ? allLessons.findIndex((l) => l.id === activeLesson.id)
    : 0;

  // Mutation to toggle lesson completion
  const progressMutation = useMutation({
    mutationFn: async ({
      lessonId,
      isCompleted,
    }: {
      lessonId: string;
      isCompleted: boolean;
    }) => {
      return learningService.updateLessonProgress(lessonId, isCompleted);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-course", courseId] });
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

  const handleNextLesson = () => {
    if (activeLessonIndex < allLessons.length - 1) {
      setSelectedLessonId(allLessons[activeLessonIndex + 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePreviousLesson = () => {
    if (activeLessonIndex > 0) {
      setSelectedLessonId(allLessons[activeLessonIndex - 1].id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <Skeleton className="h-[600px] lg:col-span-1 rounded-xl" />
          <Skeleton className="h-[600px] lg:col-span-3 rounded-xl" />
        </div>
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
  const isAllCompleted = progress.progress_percentage >= 100;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Classroom Bar */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <Link to="/my-learning">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Exit Classroom
            </Button>
          </Link>
          <div className="h-5 w-px bg-border hidden sm:block" />
          <div>
            <h1 className="font-bold text-base sm:text-lg text-foreground line-clamp-1">
              {learningCourse.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              Lesson {activeLessonIndex + 1} of {allLessons.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-foreground">
                {progress.progress_percentage}% Completed
              </p>
              <p className="text-[11px] text-muted-foreground">
                {progress.completed_lessons} of {progress.total_lessons} lessons
              </p>
            </div>
            <div className="h-2 w-28 bg-muted rounded-full overflow-hidden hidden sm:block">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isAllCompleted ? "bg-emerald-500" : "bg-primary"
                }`}
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
          </div>

          {/* AI Tutor Toggle Button */}
          <Button
            variant={aiTutorOpen ? "primary" : "outline"}
            size="sm"
            className="gap-1.5 border-primary/30"
            onClick={() => setAiTutorOpen(!aiTutorOpen)}
            data-testid="toggle-ai-tutor-btn"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>AI Tutor</span>
          </Button>

          {/* Mobile Sidebar Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden gap-1.5"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            Curriculum
          </Button>
        </div>
      </div>

      {/* Main Classroom Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Curriculum Sidebar */}
        <aside
          className={`lg:col-span-4 bg-card border border-border rounded-xl p-4 space-y-4 shadow-xs lg:block ${
            sidebarOpen ? "block" : "hidden"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Curriculum Modules
            </span>
            <span className="text-xs text-muted-foreground">
              {learningCourse.modules.length} Modules
            </span>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-1">
            {learningCourse.modules.map((mod, modIdx) => (
              <div key={mod.id} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-2 py-1 bg-muted/40 rounded-md">
                  <span>
                    Module {modIdx + 1}: {mod.title}
                  </span>
                  <span>
                    {mod.completed_lessons_count}/{mod.total_lessons_count}
                  </span>
                </div>

                <div className="space-y-1">
                  {mod.lessons.map((les) => {
                    const isActive = les.id === activeLesson?.id;
                    const isDone = les.is_completed;

                    return (
                      <button
                        key={les.id}
                        onClick={() => {
                          setSelectedLessonId(les.id);
                          setSidebarOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`w-full flex items-center justify-between text-left p-2.5 rounded-lg text-xs transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          {isDone ? (
                            <CheckCircle
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? "text-primary-foreground" : "text-emerald-500"
                              }`}
                            />
                          ) : (
                            <Circle
                              className={`h-4 w-4 shrink-0 ${
                                isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            />
                          )}
                          <span className="truncate">{les.title}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] opacity-80">
                          {les.content_type === "video" && <Video className="h-3 w-3" />}
                          {les.content_type === "pdf" && <FileText className="h-3 w-3" />}
                          {les.content_type === "external_resource" && (
                            <ExternalLink className="h-3 w-3" />
                          )}
                          {les.duration_minutes > 0 && <span>{les.duration_minutes}m</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Course Quizzes & Assessments */}
            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="font-semibold text-xs text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <HelpCircle className="h-3.5 w-3.5 text-primary" />
                  Assessments ({courseQuizzes.length})
                </span>
              </div>

              {courseQuizzes.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic px-2 py-1">
                  No published assessments for this course yet.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {courseQuizzes.map((quiz: StudentCourseQuizItem) => (
                    <Link
                      key={quiz.id}
                      to={`/learning/quizzes/${quiz.id}`}
                      className="block p-2 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/40 transition-colors group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {quiz.title}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                          {quiz.question_count} Qs
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>Pass: {quiz.passing_score_percentage}%</span>
                        {quiz.duration_minutes > 0 && <span>• {quiz.duration_minutes}m</span>}
                        <span>• {quiz.total_points} pts</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Lesson Viewer & Content Workspace */}
        <main className="lg:col-span-8 space-y-6">
          {activeLesson ? (
            <div className="bg-card border border-border rounded-xl p-6 md:p-8 space-y-8 shadow-xs">
              {/* Lesson Header */}
              <div className="space-y-3 pb-6 border-b border-border">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2.5 py-1 text-xs font-semibold capitalize">
                      {activeLesson.content_type.replace("_", " ")}
                    </span>
                    {activeLesson.duration_minutes > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {activeLesson.duration_minutes} minutes
                      </span>
                    )}
                  </div>

                  {/* Completion Toggle Button */}
                  <Button
                    onClick={handleToggleComplete}
                    disabled={progressMutation.isPending}
                    variant={activeLesson.is_completed ? "outline" : "primary"}
                    size="sm"
                    className="gap-2 shadow-xs"
                  >
                    <CheckCircle
                      className={`h-4 w-4 ${
                        activeLesson.is_completed ? "text-emerald-500" : "text-primary-foreground"
                      }`}
                    />
                    {activeLesson.is_completed ? "Mark as Incomplete" : "Mark as Complete"}
                  </Button>
                </div>

                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  {activeLesson.title}
                </h2>
                {activeLesson.description && (
                  <p className="text-sm text-muted-foreground">{activeLesson.description}</p>
                )}
              </div>

              {/* Dynamic Content Body based on Content Type */}
              <div className="min-h-[300px]">
                {activeLesson.content_type === "text" && (
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none space-y-4 text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {activeLesson.text_content || (
                      <p className="text-muted-foreground italic">
                        No instructional text written for this lesson yet.
                      </p>
                    )}
                  </div>
                )}

                {activeLesson.content_type === "video" && (
                  <div className="space-y-4">
                    <div className="aspect-video w-full rounded-xl bg-muted overflow-hidden flex items-center justify-center border border-border">
                      {activeLesson.resource_url?.includes("http") ? (
                        <iframe
                          src={activeLesson.resource_url}
                          title={activeLesson.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="text-center p-8 space-y-3">
                          <Video className="h-12 w-12 text-primary mx-auto opacity-70" />
                          <p className="text-sm text-foreground font-medium">Video Resource Stream</p>
                          <p className="text-xs text-muted-foreground max-w-md">
                            Resource reference: {activeLesson.resource_url || "Standard video"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeLesson.content_type === "pdf" && (
                  <div className="rounded-xl border border-border p-8 bg-muted/20 text-center space-y-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <FileText className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-base text-foreground">PDF Document Resource</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        Review the associated lecture notes, guides, and curriculum slides.
                      </p>
                    </div>
                    {activeLesson.resource_url && (
                      <a
                        href={activeLesson.resource_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <Button variant="outline" size="sm" className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Open Document Resource
                        </Button>
                      </a>
                    )}
                  </div>
                )}

                {activeLesson.content_type === "external_resource" && (
                  <div className="rounded-xl border border-border p-8 bg-muted/20 text-center space-y-4">
                    <div className="h-14 w-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                      <ExternalLink className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-base text-foreground">External Learning Reference</h4>
                      <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        This lesson links out to reference documentation, interactive sandboxes, or external labs.
                      </p>
                    </div>
                    {activeLesson.resource_url && (
                      <a
                        href={activeLesson.resource_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <Button className="gap-2">
                          <ExternalLink className="h-4 w-4" />
                          Visit External Resource
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Navigation Controls */}
              <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousLesson}
                  disabled={activeLessonIndex === 0}
                  className="gap-2 w-full sm:w-auto"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous Lesson
                </Button>

                <div className="flex items-center gap-2">
                  {!activeLesson.is_completed && (
                    <Button
                      size="sm"
                      onClick={handleToggleComplete}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Complete & Continue
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextLesson}
                    disabled={activeLessonIndex === allLessons.length - 1}
                    className="gap-2 w-full sm:w-auto"
                  >
                    Next Lesson
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-12 text-center space-y-3">
              <Sparkles className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                No lessons available in this course curriculum.
              </p>
            </div>
          )}
        </main>
      </div>
      {/* Docked / Sliding AI Tutor Drawer */}
      {aiTutorOpen && (
        <div
          className="fixed top-0 right-0 h-full w-full sm:w-[450px] z-50 p-3 sm:p-4 bg-background/90 backdrop-blur-md shadow-2xl flex flex-col border-l border-border"
          data-testid="classroom-ai-tutor-drawer"
        >
          <div className="h-full flex flex-col">
            <AITutorPanel
              courseId={courseId!}
              activeLessonId={activeLesson?.id}
              courseTitle={learningCourse.title}
              activeLessonTitle={activeLesson?.title}
              onNavigateLesson={(lessonId) => {
                setSelectedLessonId(lessonId);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onClose={() => setAiTutorOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Floating Action Button when closed */}
      {!aiTutorOpen && (
        <button
          onClick={() => setAiTutorOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl rounded-full px-4 py-3 flex items-center gap-2 font-medium text-xs transition-transform hover:scale-105"
          data-testid="floating-ai-tutor-btn"
          title="Open AI Tutor"
        >
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>Ask AI Tutor</span>
        </button>
      )}
    </div>
  );
}

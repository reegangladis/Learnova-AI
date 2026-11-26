import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bookmark,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileQuestion,
  HelpCircle,
  Menu,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { quizService } from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export function QuizTakingPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [startedAttemptId, setStartedAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string[]>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Record<string, boolean>>({});
  const [confidenceMap, setConfidenceMap] = useState<Record<string, "sure" | "unsure">>({});
  const [readinessChecks, setReadinessChecks] = useState<boolean[]>([true, true]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: quiz, isLoading: isQuizLoading, error: quizError } = useQuery({
    queryKey: ["quiz_take", quizId],
    queryFn: () => quizService.getQuizForTaking(quizId!),
    enabled: !!quizId,
  });

  const { data: attempts } = useQuery({
    queryKey: ["quiz_attempts_me", quizId],
    queryFn: () => quizService.listMyQuizAttempts(quizId!),
    enabled: !!quizId,
  });

  const activeAttemptId = startedAttemptId || quiz?.active_attempt_id || null;

  const [timeRemainingOverride, setTimeRemainingOverride] = useState<number | null>(null);
  const timeRemaining =
    timeRemainingOverride !== null
      ? timeRemainingOverride
      : (quiz?.time_remaining_seconds ?? null);

  useEffect(() => {
    if (activeAttemptId && timeRemaining !== null && timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemainingOverride((prev) => {
          const current = prev !== null ? prev : (quiz?.time_remaining_seconds ?? 0);
          if (current <= 1) {
            clearInterval(interval);
            return 0;
          }
          return current - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeAttemptId, timeRemaining, quiz?.time_remaining_seconds]);

  const startAttemptMutation = useMutation({
    mutationFn: () => quizService.startQuizAttempt(quizId!),
    onSuccess: (data) => {
      setStartedAttemptId(data.id);
      if (data.time_remaining_seconds !== null && data.time_remaining_seconds !== undefined) {
        setTimeRemainingOverride(data.time_remaining_seconds);
      }
      setErrorMessage(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        e.response?.data?.error?.message || e.message || "Failed to start quiz attempt."
      );
    },
  });

  const saveAnswerMutation = useMutation({
    mutationFn: ({ questionId, selectedIds }: { questionId: string; selectedIds: string[] }) =>
      quizService.saveAnswer(activeAttemptId!, questionId, selectedIds),
    onSuccess: () => setSaveStatus("saved"),
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setSaveStatus("idle");
      setErrorMessage(e.response?.data?.error?.message || "Failed to auto-save answer.");
    },
  });

  const submitAttemptMutation = useMutation({
    mutationFn: () => quizService.submitQuizAttempt(activeAttemptId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz_attempts_me", quizId] });
      navigate(`/learning/quizzes/${quizId}/results/${data.attempt_id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
      setErrorMessage(
        e.response?.data?.error?.message || e.message || "Failed to submit quiz attempt."
      );
    },
  });

  const handleOptionSelect = useCallback(
    (questionId: string, optionId: string, isMultiple: boolean) => {
      let updated: string[];
      const current = answersMap[questionId] || [];

      if (isMultiple) {
        updated = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        updated = [optionId];
      }

      setAnswersMap((prev) => ({ ...prev, [questionId]: updated }));
      setSaveStatus("saving");
      saveAnswerMutation.mutate({ questionId, selectedIds: updated });
    },
    [answersMap, saveAnswerMutation]
  );

  const toggleMarkQuestion = (questionId: string) => {
    setMarkedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const questions = quiz?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];

  // Keyboard shortcuts during active quiz (1-4 / a-d to pick option, left/right to navigate)
  useEffect(() => {
    if (!activeAttemptId || !currentQuestion || isSubmitModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        setCurrentQuestionIndex((p) => Math.min(questions.length - 1, p + 1));
      } else if (e.key === "ArrowLeft") {
        setCurrentQuestionIndex((p) => Math.max(0, p - 1));
      } else {
        const idxMap: Record<string, number> = { "1": 0, a: 0, "2": 1, b: 1, "3": 2, c: 2, "4": 3, d: 3 };
        const chosenIdx = idxMap[e.key.toLowerCase()];
        if (chosenIdx !== undefined && currentQuestion.options[chosenIdx]) {
          handleOptionSelect(
            currentQuestion.id,
            currentQuestion.options[chosenIdx].id,
            currentQuestion.question_type === "multiple_select"
          );
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeAttemptId, currentQuestion, questions.length, isSubmitModalOpen, handleOptionSelect]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const formatDurationReadable = (seconds?: number | null) => {
    if (!seconds) return "2 mins 15 secs";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m} mins ${s} secs` : `${s} secs`;
  };

  if (isQuizLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-10 w-64 bg-secondary rounded-xl animate-pulse mx-auto" />
        <div className="h-40 bg-secondary rounded-2xl animate-pulse" />
        <div className="h-64 bg-secondary rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (quizError || !quiz) {
    return (
      <div className="p-8 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="font-display text-xl font-bold text-foreground">Assessment Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          This quiz is either unpublished or you are not enrolled in the associated course.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const answeredCount = Object.keys(answersMap).filter(
    (qid) => answersMap[qid] && answersMap[qid].length > 0
  ).length;

  // =========================================================================
  // VIEW 1: Studio Assessment Briefing (Pre-Start)
  // =========================================================================
  if (!activeAttemptId) {
    const pastCompleted = (attempts || []).filter((a) => a.status === "completed");
    const bestScore =
      pastCompleted.length > 0
        ? Math.max(...pastCompleted.map((a) => a.percentage_score))
        : null;
    const canAttempt = quiz.max_attempts === 0 || pastCompleted.length < quiz.max_attempts;

    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-10 animate-fade-in">
        {/* Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              to={`/learning/courses/${quiz.course_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground"
            >
              <Menu className="w-3.5 h-3.5 text-teal-600" />
              <span>Course modules</span>
            </Link>
            <Link
              to={`/courses/${quiz.course_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-card border border-border hover:bg-secondary text-xs font-semibold text-foreground"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Back to course</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/25 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Prep with AI Copilot</span>
          </button>
        </div>

        {/* Studio Exam Briefing Header */}
        <div className="studio-card border-t-4 border-t-orange-500 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/12 border border-orange-500/25 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                {quiz.description || "Module Knowledge Verification"}
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {quiz.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5 font-mono">
                <span
                  className={`w-2 h-2 rounded-full ${
                    pastCompleted.length > 0 ? "bg-emerald-500" : "bg-orange-500"
                  }`}
                />
                <span>
                  {pastCompleted.length > 0
                    ? `Submitted · ${pastCompleted.length} attempt${
                        pastCompleted.length > 1 ? "s" : ""
                      } recorded`
                    : `${quiz.question_count} Questions · ${
                        quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"
                      }`}
                </span>
              </div>
            </div>
          </div>

          <Button
            id="btn-start-quiz"
            onClick={() => startAttemptMutation.mutate()}
            disabled={!canAttempt || startAttemptMutation.isPending}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-6 py-3 rounded-xl shadow-[0_3px_0_0_#0f766e] cursor-pointer shrink-0"
          >
            {startAttemptMutation.isPending
              ? "Starting..."
              : !canAttempt
              ? "No Attempts Remaining"
              : pastCompleted.length > 0
              ? "Re-attempt quiz"
              : "Start Assessment"}
          </Button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Unable to Start</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Parameters + Readiness Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 studio-card p-6 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Duration
                </span>
                <span className="font-display text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-600" />
                  {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Pass Threshold
                </span>
                <span className="font-display text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-orange-500" />
                  {quiz.passing_score_percentage}%
                </span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Questions
                </span>
                <span className="font-display text-sm font-bold text-foreground mt-1 flex items-center gap-1.5">
                  <FileQuestion className="w-3.5 h-3.5 text-blue-600" />
                  {quiz.question_count} Items
                </span>
              </div>
              <div className="p-3 rounded-xl bg-secondary/60 border border-border">
                <span className="text-[10px] font-mono uppercase text-muted-foreground block">
                  Attempts Used
                </span>
                <span className="font-display text-sm font-bold text-foreground mt-1 block">
                  {pastCompleted.length} / {quiz.max_attempts > 0 ? quiz.max_attempts : "∞"}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border space-y-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                Assessment Guidelines
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {quiz.instructions ||
                  "Read each question carefully. Answers are automatically saved as you select options. You can press 1-4 / A-D for fast selection and flag questions to review before submitting."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-4 studio-card p-6 space-y-3 bg-secondary/35">
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Pre-Flight Checklist
            </h3>
            {[
              "Reviewed module slide decks & key takeaways",
              "Quiet focus session ready (Keyboard 1-4 active)",
            ].map((tip, idx) => (
              <button
                key={tip}
                type="button"
                onClick={() =>
                  setReadinessChecks((prev) => prev.map((v, i) => (i === idx ? !v : v)))
                }
                className="w-full text-left p-2.5 rounded-xl bg-card border border-border flex items-start gap-2.5 text-xs text-foreground cursor-pointer"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 mt-0.5 border ${
                    readinessChecks[idx]
                      ? "bg-teal-600 border-teal-600 text-white"
                      : "border-border"
                  }`}
                >
                  {readinessChecks[idx] && <Check className="w-3 h-3" />}
                </span>
                <span>{tip}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Attempt History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-display text-sm font-bold text-foreground">Your attempts</h3>
            {bestScore !== null && (
              <span className="text-xs text-muted-foreground font-mono">
                Best Score: <strong className="text-emerald-600">{bestScore}%</strong>
              </span>
            )}
          </div>

          {!attempts || attempts.length === 0 ? (
            <div className="studio-card p-8 text-center">
              <p className="text-xs text-muted-foreground">
                No previous attempts recorded yet. Click{" "}
                <strong className="text-foreground">Start Assessment</strong> above when ready.
              </p>
            </div>
          ) : (
            <div className="studio-card p-4 sm:p-5 space-y-3">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="rounded-xl border border-border p-4 bg-secondary/35 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-bold text-foreground">
                        Attempt #{att.attempt_number}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          att.passed
                            ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 text-[10px]"
                            : "border-rose-500/30 text-rose-700 dark:text-rose-300 bg-rose-500/10 text-[10px]"
                        }
                      >
                        {att.percentage_score}% ({att.score}/{att.max_score} pts) ·{" "}
                        {att.passed ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground">
                      Duration: {formatDurationReadable(att.time_spent_seconds)} · Status:{" "}
                      {att.status === "completed" ? "Finished" : att.status}
                    </p>
                  </div>

                  <Link to={`/learning/quizzes/${quiz.id}/results/${att.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-8 gap-1.5 rounded-xl">
                      <Eye className="w-3.5 h-3.5" />
                      <span>Review Attempt</span>
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Interactive Split Exam Arena
  // =========================================================================
  const progressPct =
    questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Arena Header Bar */}
      <div className="sticky top-16 z-30 studio-card px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
              EXAM ARENA · ATTEMPT LIVE
            </span>
            <h2 className="font-display text-sm sm:text-base font-bold text-foreground line-clamp-1">
              {quiz.title}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-xs font-mono text-orange-600 animate-pulse">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs font-mono text-emerald-600 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" /> Saved
            </span>
          )}

          {timeRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
                timeRemaining <= 120
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-600 animate-pulse"
                  : "bg-secondary border-border text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeRemaining)}</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartedAttemptId(null)}
            className="h-8 text-xs font-semibold rounded-xl"
          >
            Exit View
          </Button>

          <Button
            id="btn-submit-quiz"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 rounded-xl"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Split Workbench Grid (Question Card + Navigator Matrix) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLS: Question Card */}
        <div className="lg:col-span-8">
          {currentQuestion && (
            <div className="studio-card p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-display text-lg font-bold text-foreground">
                    Question {currentQuestionIndex + 1}
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">
                    of {questions.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Confidence self-tag */}
                  <button
                    type="button"
                    onClick={() =>
                      setConfidenceMap((prev) => ({
                        ...prev,
                        [currentQuestion.id]:
                          prev[currentQuestion.id] === "sure" ? "unsure" : "sure",
                      }))
                    }
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                      confidenceMap[currentQuestion.id] === "sure"
                        ? "bg-teal-500/12 border-teal-500/30 text-teal-700 dark:text-teal-300"
                        : confidenceMap[currentQuestion.id] === "unsure"
                        ? "bg-orange-500/12 border-orange-500/30 text-orange-700 dark:text-orange-300"
                        : "bg-secondary border-border text-muted-foreground"
                    }`}
                  >
                    {confidenceMap[currentQuestion.id] === "sure"
                      ? "✓ Confident"
                      : confidenceMap[currentQuestion.id] === "unsure"
                      ? "? Unsure"
                      : "Tag Confidence"}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleMarkQuestion(currentQuestion.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                      markedQuestions[currentQuestion.id]
                        ? "bg-orange-500/15 border-orange-500/35 text-orange-700 dark:text-orange-300"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{markedQuestions[currentQuestion.id] ? "Marked" : "Mark question"}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(answersMap[currentQuestion.id] || []).length > 0 ? (
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    Answer saved
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-md bg-orange-500/10 border border-orange-500/25 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                    Not yet answered
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md bg-secondary border border-border text-[11px] font-mono text-muted-foreground">
                  {currentQuestion.points.toFixed(2)} pts
                </span>
                <span className="px-2.5 py-1 rounded-md bg-teal-500/10 border border-teal-500/25 text-[11px] font-mono text-teal-700 dark:text-teal-300 capitalize">
                  {currentQuestion.question_type.replace("_", " ")}
                </span>
              </div>

              <div className="text-base sm:text-lg font-bold text-foreground leading-relaxed">
                {currentQuestion.question_text}
              </div>

              <div className="space-y-2.5">
                {currentQuestion.options.map((opt, optIdx) => {
                  const selectedList = answersMap[currentQuestion.id] || [];
                  const isSelected = selectedList.includes(opt.id);
                  const isMultiple = currentQuestion.question_type === "multiple_select";
                  const optionLetter = String.fromCharCode(65 + optIdx);

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionSelect(currentQuestion.id, opt.id, isMultiple)}
                      className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-teal-500/10 border-teal-600 text-foreground ring-1 ring-teal-600/40"
                          : "bg-background border-border text-foreground/90 hover:bg-secondary/60"
                      }`}
                    >
                      <span
                        className={`w-6 h-6 shrink-0 border flex items-center justify-center font-mono text-xs font-bold transition-colors ${
                          isMultiple ? "rounded-md" : "rounded-full"
                        } ${
                          isSelected
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-border bg-secondary text-muted-foreground"
                        }`}
                      >
                        {optionLetter}
                      </span>

                      <span className="text-xs sm:text-sm font-medium">{opt.option_text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation Footer */}
              <div className="pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="text-xs font-semibold gap-1.5 h-9 px-4 rounded-xl"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous Question</span>
                </Button>

                <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground">
                  Shortcuts: Keys 1-4 select · ← → step
                </span>

                {currentQuestionIndex < questions.length - 1 ? (
                  <Button
                    onClick={() =>
                      setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                    }
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs gap-1.5 h-9 px-5 rounded-xl"
                  >
                    <span>Next Question</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsSubmitModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9 px-5 rounded-xl"
                  >
                    <span>Review &amp; Submit</span>
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLS: Interactive Question Matrix */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-36">
          <div className="studio-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase font-mono text-muted-foreground">
                Question Matrix
              </span>
              <span className="text-xs font-mono font-bold text-foreground">
                {answeredCount}/{questions.length} Done
              </span>
            </div>

            <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = (answersMap[q.id] || []).length > 0;
                const isCurrent = idx === currentQuestionIndex;
                const isFlagged = !!markedQuestions[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-9 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                      isCurrent
                        ? "bg-foreground text-background border-foreground ring-2 ring-teal-500/40"
                        : isFlagged
                        ? "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/35"
                        : isAnswered
                        ? "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" /> Flagged
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> Unseen
              </span>
            </div>
          </div>

          <Link
            to={`/courses/${quiz.course_id}`}
            className="studio-card p-3.5 flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <ChevronLeft className="w-3.5 h-3.5" /> Return to Course Hub
            </span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-fade-in">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 mb-2">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground">Ready to Submit?</h3>
              <p className="text-xs text-muted-foreground">
                You have answered <span className="font-bold text-foreground">{answeredCount}</span> of{" "}
                <span className="font-bold text-foreground">{questions.length}</span> questions.
              </p>
              {answeredCount < questions.length && (
                <p className="text-xs text-orange-700 dark:text-orange-300 bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/25">
                  Warning: Unanswered questions will receive zero points.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={submitAttemptMutation.isPending}
                className="text-xs rounded-xl"
              >
                Keep Reviewing
              </Button>
              <Button
                onClick={() => submitAttemptMutation.mutate()}
                disabled={submitAttemptMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                {submitAttemptMutation.isPending ? "Grading..." : "Confirm & Grade Quiz"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

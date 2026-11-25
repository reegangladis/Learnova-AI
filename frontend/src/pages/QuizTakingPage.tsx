import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileQuestion,
  Clock,
  Award,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  HelpCircle,
  Check,
  CheckSquare,
  Eye,
  Bookmark,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
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
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Quiz Details for Taking
  const { data: quiz, isLoading: isQuizLoading, error: quizError } = useQuery({
    queryKey: ["quiz_take", quizId],
    queryFn: () => quizService.getQuizForTaking(quizId!),
    enabled: !!quizId,
  });

  // 2. Fetch Student's Past Attempts
  const { data: attempts } = useQuery({
    queryKey: ["quiz_attempts_me", quizId],
    queryFn: () => quizService.listMyQuizAttempts(quizId!),
    enabled: !!quizId,
  });

  const activeAttemptId = startedAttemptId || quiz?.active_attempt_id || null;

  // Timer state
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

  // Start Attempt Mutation
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

  // Save Answer Mutation
  const saveAnswerMutation = useMutation({
    mutationFn: ({ questionId, selectedIds }: { questionId: string; selectedIds: string[] }) =>
      quizService.saveAnswer(activeAttemptId!, questionId, selectedIds),
    onSuccess: () => {
      setSaveStatus("saved");
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setSaveStatus("idle");
      setErrorMessage(e.response?.data?.error?.message || "Failed to auto-save answer.");
    },
  });

  // Submit Attempt Mutation
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

  const handleOptionSelect = (questionId: string, optionId: string, isMultiple: boolean) => {
    let updated: string[];
    const current = answersMap[questionId] || [];

    if (isMultiple) {
      if (current.includes(optionId)) {
        updated = current.filter((id) => id !== optionId);
      } else {
        updated = [...current, optionId];
      }
    } else {
      updated = [optionId];
    }

    setAnswersMap((prev) => ({ ...prev, [questionId]: updated }));
    setSaveStatus("saving");
    saveAnswerMutation.mutate({ questionId, selectedIds: updated });
  };

  const toggleMarkQuestion = (questionId: string) => {
    setMarkedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

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
        <div className="h-10 w-64 bg-slate-200/70 rounded-xl animate-pulse mx-auto" />
        <div className="h-40 bg-slate-200/70 rounded-2xl animate-pulse" />
        <div className="h-64 bg-slate-200/70 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (quizError || !quiz) {
    return (
      <div className="p-8 text-center space-y-4 max-w-xl mx-auto">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Assessment Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          This quiz is either unpublished or you are not enrolled in the associated course.
        </p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answersMap).filter(
    (qid) => answersMap[qid] && answersMap[qid].length > 0
  ).length;

  // =========================================================================
  // VIEW 1: Instructions & Pre-Start Screen (Screenshot 3 Layout)
  // =========================================================================
  if (!activeAttemptId) {
    const pastCompleted = (attempts || []).filter((a) => a.status === "completed");
    const bestScore =
      pastCompleted.length > 0
        ? Math.max(...pastCompleted.map((a) => a.percentage_score))
        : null;
    const canAttempt = quiz.max_attempts === 0 || pastCompleted.length < quiz.max_attempts;

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-10 animate-in fade-in duration-300">
        {/* Top Centered Navigation Pills (Consistent across Course views) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-ai-copilot"))}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 shadow-2xs text-xs font-bold text-slate-700 hover:text-indigo-700 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>AI features</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/learning/courses/${quiz.course_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <Menu className="w-3.5 h-3.5 text-slate-500" />
              <span>Course modules</span>
            </Link>
            <Link
              to={`/courses/${quiz.course_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>Back to course</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {pastCompleted.length > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
                Done
              </span>
            )}
          </div>
        </div>

        {/* Dark Petrol Hero Assessment Card (Screenshot 3) */}
        <div className="rounded-2xl bg-gradient-to-r from-[#063B50] via-[#052E40] to-[#04212E] p-6 sm:p-8 text-white shadow-md border border-[#144E6D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-sky-200/80 block">
                {quiz.description || "Module Knowledge Verification"}
              </span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                {quiz.title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-300 pt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    pastCompleted.length > 0 ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                <span>
                  {pastCompleted.length > 0
                    ? `Submitted · ${pastCompleted.length} attempt${
                        pastCompleted.length > 1 ? "s" : ""
                      } made`
                    : `${quiz.question_count} Questions · ${
                        quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"
                      }`}
                </span>
              </div>
            </div>
          </div>

          <div className="shrink-0">
            <Button
              id="btn-start-quiz"
              onClick={() => startAttemptMutation.mutate()}
              disabled={!canAttempt || startAttemptMutation.isPending}
              className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs px-5 py-2.5 rounded-lg shadow-md"
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
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Unable to Start</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Grading Method & Assessment Parameters Card (Screenshot 3) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                GRADING METHOD
              </span>
              <p className="text-sm font-extrabold text-slate-900 mt-0.5">Highest grade</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-semibold text-slate-700">
                  {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold text-slate-700">
                  Pass: {quiz.passing_score_percentage}%
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center gap-1.5">
                <FileQuestion className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-semibold text-slate-700">
                  {quiz.question_count} Questions
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="font-semibold text-slate-700">
                  Attempts: {pastCompleted.length} /{" "}
                  {quiz.max_attempts > 0 ? quiz.max_attempts : "∞"}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              Assessment Guidelines
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {quiz.instructions ||
                "Read each question carefully. Answers are automatically saved as you progress. You can flag questions for review before final submission."}
            </p>
          </div>
        </div>

        {/* Your Attempts Section (Screenshot 3) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-extrabold text-slate-900">Your attempts</h3>
            {bestScore !== null && (
              <span className="text-xs text-slate-500 font-medium">
                Highest score:{" "}
                <strong className="text-emerald-600 font-bold">{bestScore}%</strong>
              </span>
            )}
          </div>

          {!attempts || attempts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <p className="text-xs text-slate-500">
                No previous attempts recorded yet. Click{" "}
                <strong className="text-slate-800">Start Assessment</strong> above to begin!
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="rounded-xl border border-slate-200/90 p-4 space-y-4 bg-slate-50/30"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Attempt {att.attempt_number}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        att.passed
                          ? "border-emerald-200 text-emerald-700 bg-emerald-50 text-[10px]"
                          : "border-rose-200 text-rose-700 bg-rose-50 text-[10px]"
                      }
                    >
                      {att.percentage_score}% ({att.score}/{att.max_score} pts) ·{" "}
                      {att.passed ? "PASSED" : "FAILED"}
                    </Badge>
                  </div>

                  {/* 4 Info Boxes Grid (Screenshot 3) */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Status
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block capitalize">
                        {att.status === "completed" ? "Finished" : att.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Started
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {new Date(att.started_at).toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        ,{" "}
                        {new Date(att.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Completed
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {att.submitted_at
                          ? `${new Date(att.submitted_at).toLocaleDateString(undefined, {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}, ${new Date(att.submitted_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "—"}
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                      <span className="text-[10px] text-slate-400 font-semibold block">
                        Duration
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {formatDurationReadable(att.time_spent_seconds)}
                      </span>
                    </div>
                  </div>

                  {/* Warm Amber Review CTA (Screenshot 3) */}
                  <div>
                    <Link to={`/learning/quizzes/${quiz.id}/results/${att.id}`}>
                      <Button className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs h-8 px-4 gap-1.5 shadow-2xs">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Review</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom Corner Navigation Cards (Screenshot 3) */}
        <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
          <Link
            to={`/learning/courses/${quiz.course_id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all"
          >
            <ChevronLeft className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                PREVIOUS
              </span>
              <span className="text-xs font-bold text-slate-800">Presentation Slides</span>
            </div>
          </Link>

          <Link
            to={`/courses/${quiz.course_id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all text-right"
          >
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                NEXT
              </span>
              <span className="text-xs font-bold text-slate-800">Course Modules Hub</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Active Taking Classroom Interface (Screenshot 4 Layout)
  // =========================================================================
  const progressPct =
    questions.length > 0 ? Math.round(((currentQuestionIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Centered Navigation Pills (Screenshot 4) */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          to={`/learning/courses/${quiz.course_id}`}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
        >
          <Menu className="w-3.5 h-3.5 text-slate-500" />
          <span>Course modules</span>
        </Link>
        <Link
          to={`/courses/${quiz.course_id}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-slate-500" />
          <span>Back to course</span>
        </Link>
      </div>

      {/* Assessment Attempt Header Card (Screenshot 4) */}
      <div className="sticky top-2 z-30 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              QUIZ · ATTEMPT
            </span>
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 line-clamp-1">
              {quiz.title}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Save indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {saveStatus === "saving" && (
              <span className="text-amber-600 font-medium animate-pulse">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          {/* Progress Track & Question Counter */}
          <div className="flex flex-col items-end gap-1 min-w-[140px]">
            <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E59819] rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              Question {currentQuestionIndex + 1} of {questions.length} · {answeredCount} answered
            </span>
          </div>

          {/* Countdown Timer */}
          {timeRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                timeRemaining <= 120
                  ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeRemaining)}</span>
            </div>
          )}

          {/* Back to overview */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStartedAttemptId(null)}
            className="h-8 text-xs font-semibold text-slate-600"
          >
            Back
          </Button>

          <Button
            id="btn-submit-quiz"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="h-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Question Card (Screenshot 4 Styled) */}
      {currentQuestion && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Card Header: Question N + Mark question button */}
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Question {currentQuestionIndex + 1}
            </h3>

            <button
              type="button"
              onClick={() => toggleMarkQuestion(currentQuestion.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                markedQuestions[currentQuestion.id]
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{markedQuestions[currentQuestion.id] ? "Marked" : "Mark question"}</span>
            </button>
          </div>

          {/* Pill Status Tags Row (Screenshot 4) */}
          <div className="flex flex-wrap items-center gap-2">
            {(answersMap[currentQuestion.id] || []).length > 0 ? (
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-700">
                Answer saved
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-md bg-amber-50/80 border border-amber-200/80 text-[11px] font-semibold text-amber-800">
                Not yet answered
              </span>
            )}
            <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-600">
              Marked out of {currentQuestion.points.toFixed(2)}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-200/70 text-[11px] font-semibold text-indigo-700 capitalize">
              {currentQuestion.question_type.replace("_", " ")}
            </span>
          </div>

          {/* Question Text */}
          <div className="text-sm sm:text-base font-bold text-slate-800 leading-relaxed pt-1">
            {currentQuestion.question_text}
          </div>

          {/* Options List with a., b., c., d. Radio Boxes (Screenshot 4) */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, optIdx) => {
              const selectedList = answersMap[currentQuestion.id] || [];
              const isSelected = selectedList.includes(opt.id);
              const isMultiple = currentQuestion.question_type === "multiple_select";
              const optionLetter = String.fromCharCode(97 + optIdx); // a, b, c, d

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleOptionSelect(currentQuestion.id, opt.id, isMultiple)}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#063B50]/5 border-[#063B50] text-slate-950 ring-1 ring-[#063B50]"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {/* Radio / Checkbox Circle */}
                  <div
                    className={`w-4 h-4 shrink-0 border flex items-center justify-center transition-colors ${
                      isMultiple ? "rounded" : "rounded-full"
                    } ${
                      isSelected
                        ? "border-[#063B50] bg-[#063B50] text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && (
                      <div className={isMultiple ? "w-2 h-2 bg-white" : "w-1.5 h-1.5 rounded-full bg-white"} />
                    )}
                  </div>

                  {/* Option text with lowercase "a." prefix matching Screenshot 4 */}
                  <span className="text-xs sm:text-sm font-medium text-slate-800">
                    <span className="font-semibold text-slate-500 mr-2">{optionLetter}.</span>
                    {opt.option_text}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Footer Navigation (Screenshot 4: Previous Question | Next Question Amber) */}
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
              className="text-xs font-semibold text-slate-700 border-slate-200 gap-1.5 h-9 px-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Previous Question</span>
            </Button>

            {/* Quick Number Dots */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs px-2">
              {questions.map((q, idx) => {
                const isAnswered = (answersMap[q.id] || []).length > 0;
                const isCurrent = idx === currentQuestionIndex;
                const isFlagged = !!markedQuestions[q.id];
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-7 w-7 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-[#063B50] text-white ring-2 ring-[#063B50]/30"
                        : isFlagged
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : isAnswered
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() =>
                  setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))
                }
                className="bg-[#E59819] hover:bg-[#D48810] text-slate-950 font-bold text-xs gap-1.5 h-9 px-5 shadow-2xs"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <Button
                onClick={() => setIsSubmitModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 h-9 px-5 shadow-2xs"
              >
                <span>Review &amp; Submit</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bottom Corner Course Navigation Cards (Screenshot 4) */}
      <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
        <Link
          to={`/learning/courses/${quiz.course_id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all"
        >
          <ChevronLeft className="w-4 h-4 text-slate-400" />
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              PREVIOUS
            </span>
            <span className="text-xs font-bold text-slate-800">Course Lessons</span>
          </div>
        </Link>

        <Link
          to={`/courses/${quiz.course_id}`}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs transition-all text-right"
        >
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              NEXT
            </span>
            <span className="text-xs font-bold text-slate-800">Course Overview</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 mb-2">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-900">Ready to Submit?</h3>
              <p className="text-xs text-slate-600">
                You have answered <span className="font-bold text-slate-900">{answeredCount}</span>{" "}
                of <span className="font-bold text-slate-900">{questions.length}</span> questions.
              </p>
              {answeredCount < questions.length && (
                <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  Warning: Unanswered questions will receive zero points.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={submitAttemptMutation.isPending}
                className="text-xs"
              >
                Keep Reviewing
              </Button>
              <Button
                onClick={() => submitAttemptMutation.mutate()}
                disabled={submitAttemptMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
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

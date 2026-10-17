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
  History,
  Check,
  ShieldAlert,
} from "lucide-react";

import { quizService } from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export function QuizTakingPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [startedAttemptId, setStartedAttemptId] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [answersMap, setAnswersMap] = useState<Record<string, string[]>>({});
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Quiz Details for Taking (questions stripped of answers)
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

  // Purely derived active attempt ID without cascading setState in an effect
  const activeAttemptId = startedAttemptId || quiz?.active_attempt_id || null;

  // Timer state without cascading setState in an effect
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
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.error?.message || err.message || "Failed to start quiz attempt."
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
    onError: (err: any) => {
      setSaveStatus("idle");
      setErrorMessage(err.response?.data?.error?.message || "Failed to auto-save answer.");
    },
  });

  // Submit Attempt Mutation
  const submitAttemptMutation = useMutation({
    mutationFn: () => quizService.submitQuizAttempt(activeAttemptId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quiz_attempts_me", quizId] });
      navigate(`/learning/quizzes/${quizId}/results/${data.attempt_id}`);
    },
    onError: (err: any) => {
      setErrorMessage(
        err.response?.data?.error?.message || err.message || "Failed to submit quiz attempt."
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (isQuizLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 bg-card/40 rounded-lg animate-pulse" />
        <div className="h-80 bg-card/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (quizError || !quiz) {
    return (
      <div className="p-8 text-center space-y-4">
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
  // VIEW 1: Instructions & Pre-Start Screen
  // =========================================================================
  if (!activeAttemptId) {
    const pastCompleted = (attempts || []).filter((a) => a.status === "completed");
    const bestScore = pastCompleted.length > 0 ? Math.max(...pastCompleted.map((a) => a.percentage_score)) : null;
    const canAttempt = quiz.max_attempts === 0 || pastCompleted.length < quiz.max_attempts;

    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
        <div className="space-y-2">
          <Link
            to={`/learning/courses/${quiz.course_id}`}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Course Classroom
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="text-muted-foreground text-sm">{quiz.description}</p>
          )}
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to Start</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Assessment Parameter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-card/50 border-border text-center p-4">
            <Clock className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Duration
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"}
            </p>
          </Card>
          <Card className="bg-card/50 border-border text-center p-4">
            <Award className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Passing Score
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {quiz.passing_score_percentage}%
            </p>
          </Card>
          <Card className="bg-card/50 border-border text-center p-4">
            <FileQuestion className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Questions
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {quiz.question_count}
            </p>
          </Card>
          <Card className="bg-card/50 border-border text-center p-4">
            <ShieldAlert className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Attempts
            </p>
            <p className="text-lg font-bold text-foreground mt-1">
              {pastCompleted.length} / {quiz.max_attempts > 0 ? quiz.max_attempts : "∞"}
            </p>
          </Card>
        </div>

        {/* Instructions Card */}
        <Card className="bg-card/60 border-border">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-400" />
              Assessment Guidelines
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              {quiz.instructions ||
                "Please read each question carefully. Once started, answers will automatically save as you make selections. You can navigate between questions before making a final submission."}
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground/90 pl-1">
              <li>Deterministic scoring: single-choice and true/false award full question points on correct selection.</li>
              <li>Multiple-select questions require identifying all correct options (all-or-nothing grading rule).</li>
              <li>Unanswered questions receive 0 points.</li>
              {quiz.duration_minutes > 0 && (
                <li className="text-amber-400">
                  Timer counts down in real-time. Ensure you submit before the clock expires.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div>
            {bestScore !== null && (
              <span className="text-xs text-muted-foreground">
                Your Best Score: <span className="font-bold text-emerald-400">{bestScore}%</span>
              </span>
            )}
          </div>
          <Button
            id="btn-start-quiz"
            variant="primary"
            size="lg"
            onClick={() => startAttemptMutation.mutate()}
            disabled={!canAttempt || startAttemptMutation.isPending}
            className="flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            {startAttemptMutation.isPending
              ? "Starting..."
              : canAttempt
              ? "Start Assessment"
              : "No Attempts Remaining"}
          </Button>
        </div>

        {/* Past Attempts History */}
        {attempts && attempts.length > 0 && (
          <div className="space-y-3 pt-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <History className="w-4 h-4" />
              Past Attempt History
            </h3>
            <div className="space-y-2">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card/40 text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-foreground">
                      Attempt #{att.attempt_number}
                    </span>
                    <p className="text-muted-foreground">
                      {new Date(att.started_at).toLocaleDateString()} at{" "}
                      {new Date(att.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-extrabold ${
                        att.passed ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {att.percentage_score}% ({att.score}/{att.max_score} pts)
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        att.passed
                          ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                          : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                      }
                    >
                      {att.passed ? "PASSED" : "FAILED"}
                    </Badge>
                    <Link to={`/learning/quizzes/${quiz.id}/results/${att.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        Review
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Active Taking Classroom Interface
  // =========================================================================
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Floating Assessment Bar */}
      <div className="sticky top-2 z-30 flex items-center justify-between gap-4 p-4 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-lg">
        <div>
          <h2 className="text-base font-bold text-foreground line-clamp-1">{quiz.title}</h2>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span>•</span>
            <span className="text-indigo-400 font-semibold">
              {answeredCount} Answered
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            {saveStatus === "saving" && (
              <span className="text-amber-400 animate-pulse">Saving...</span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>

          {/* Countdown Timer */}
          {timeRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${
                timeRemaining <= 120
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400 animate-pulse"
                  : "bg-background border-border text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatTimer(timeRemaining)}</span>
            </div>
          )}

          <Button
            id="btn-submit-quiz"
            variant="primary"
            size="sm"
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Submit
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Progress Track */}
      <div className="h-1.5 w-full bg-card rounded-full overflow-hidden border border-border">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card className="border-border bg-card/70 shadow-sm">
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 capitalize">
                {currentQuestion.question_type.replace("_", " ")}
              </Badge>
              <span className="text-xs text-muted-foreground font-semibold">
                {currentQuestion.points} {currentQuestion.points === 1 ? "Point" : "Points"}
              </span>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
              {currentQuestion.question_text}
            </h3>

            {/* Answer Options */}
            <div className="space-y-3 pt-2">
              {currentQuestion.options.map((opt, optIdx) => {
                const selectedList = answersMap[currentQuestion.id] || [];
                const isSelected = selectedList.includes(opt.id);
                const isMultiple = currentQuestion.question_type === "multiple_select";

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleOptionSelect(currentQuestion.id, opt.id, isMultiple)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary"
                        : "bg-background/80 border-border text-muted-foreground hover:bg-card/90 hover:text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold border ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="text-sm font-medium">{opt.option_text}</span>
                    </div>

                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded ${
                        isMultiple ? "rounded-md" : "rounded-full"
                      } border ${
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-border"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-xs px-2">
          {questions.map((q, idx) => {
            const isAnswered = (answersMap[q.id] || []).length > 0;
            const isCurrent = idx === currentQuestionIndex;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`h-7 w-7 rounded-md text-xs font-bold transition-all ${
                  isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background"
                    : isAnswered
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="flex items-center gap-2"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => setIsSubmitModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            Review & Submit
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Submit Confirmation Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="text-center space-y-2">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 mb-2">
                <Send className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Ready to Submit?</h3>
              <p className="text-sm text-muted-foreground">
                You have answered <span className="font-bold text-foreground">{answeredCount}</span> of{" "}
                <span className="font-bold text-foreground">{questions.length}</span> questions.
              </p>
              {answeredCount < questions.length && (
                <p className="text-xs text-amber-400 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                  Warning: Unanswered questions will receive zero points.
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                disabled={submitAttemptMutation.isPending}
              >
                Keep Reviewing
              </Button>
              <Button
                variant="primary"
                onClick={() => submitAttemptMutation.mutate()}
                disabled={submitAttemptMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
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

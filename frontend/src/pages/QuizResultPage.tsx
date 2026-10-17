import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  RotateCcw,
  Check,
  AlertCircle,
  BookOpen,
  HelpCircle,
} from "lucide-react";

import { quizService } from "@/services/quizService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

export function QuizResultPage() {
  const { attemptId } = useParams<{ quizId: string; attemptId: string }>();

  const { data: result, isLoading, error } = useQuery({
    queryKey: ["quiz_result", attemptId],
    queryFn: () => quizService.getQuizResult(attemptId!),
    enabled: !!attemptId,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-44 bg-card/40 rounded-2xl animate-pulse" />
        <div className="h-64 bg-card/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Result Unavailable</h2>
        <Link to="/my-learning">
          <Button variant="outline">Back to My Learning</Button>
        </Link>
      </div>
    );
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return "< 1 min";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/learning/quizzes/${result.quiz_id}`}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quiz Overview
        </Link>
        <span className="text-xs text-muted-foreground">Attempt #{result.attempt_number}</span>
      </div>

      {/* Hero Outcome Card */}
      <Card
        className={`border-2 ${
          result.passed
            ? "border-emerald-500/40 bg-emerald-950/20 shadow-emerald-950/30"
            : "border-rose-500/40 bg-rose-950/20 shadow-rose-950/30"
        } shadow-2xl overflow-hidden`}
      >
        <CardContent className="p-8 text-center space-y-6">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mx-auto">
            {result.passed ? (
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            ) : (
              <XCircle className="w-16 h-16 text-rose-400" />
            )}
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tight text-foreground">
              {result.passed ? "Assessment Passed!" : "Assessment Incomplete"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {result.passed
                ? "Congratulations! You have satisfied the mastery criteria for this quiz."
                : "You did not achieve the required passing score on this attempt."}
            </p>
          </div>

          {/* Metric Badges */}
          <div className="flex items-center justify-center gap-4 sm:gap-8 pt-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Your Score
              </p>
              <p
                className={`text-3xl font-black mt-1 ${
                  result.passed ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.percentage_score}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {result.score} / {result.max_score} pts
              </p>
            </div>

            <div className="h-10 w-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Pass Threshold
              </p>
              <p className="text-3xl font-black text-foreground mt-1">
                {result.passing_score_percentage}%
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Required minimum</p>
            </div>

            <div className="h-10 w-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                Time Spent
              </p>
              <p className="text-3xl font-black text-foreground mt-1">
                {formatDuration(result.time_spent_seconds)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Duration</p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-center gap-3 pt-4 border-t border-border/50">
            {result.can_retake && (
              <Link to={`/learning/quizzes/${result.quiz_id}`}>
                <Button variant="primary" className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />
                  Retake Assessment
                </Button>
              </Link>
            )}
            <Link to="/my-learning">
              <Button variant="outline" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Return to My Learning
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Question Review */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">Detailed Question Review</h2>

        <div className="space-y-4">
          {result.question_results.map((qr, index) => {
            const isCorrect = qr.is_correct;
            return (
              <Card
                key={qr.question_id}
                className={`border ${
                  isCorrect
                    ? "border-emerald-500/20 bg-card/60"
                    : "border-rose-500/20 bg-card/60"
                }`}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold flex-shrink-0 ${
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-rose-500/20 text-rose-400"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{qr.question_text}</h3>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">
                          {qr.question_type.replace("_", " ")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <Badge
                        variant="outline"
                        className={
                          isCorrect
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-rose-500/30 text-rose-400 bg-rose-500/10"
                        }
                      >
                        {qr.points_awarded} / {qr.points_possible} pts
                      </Badge>
                    </div>
                  </div>

                  {/* Options with student and correct markings */}
                  <div className="space-y-2 pt-1">
                    {qr.options.map((opt, optIdx) => {
                      const wasSelected = qr.selected_option_ids.includes(opt.id);
                      const isOptionCorrect = qr.correct_option_ids.includes(opt.id);

                      let styleClass = "bg-background/80 border-border text-muted-foreground";
                      if (wasSelected && isOptionCorrect) {
                        styleClass =
                          "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-medium";
                      } else if (wasSelected && !isOptionCorrect) {
                        styleClass =
                          "bg-rose-500/15 border-rose-500/40 text-rose-300 line-through";
                      } else if (!wasSelected && isOptionCorrect) {
                        styleClass =
                          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400/90 border-dashed";
                      }

                      return (
                        <div
                          key={opt.id}
                          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${styleClass}`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <span>{opt.option_text}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            {wasSelected && (
                              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-background/50 border border-border">
                                Your Selection
                              </span>
                            )}
                            {isOptionCorrect && (
                              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Correct Answer
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {qr.explanation && (
                    <div className="p-3 rounded-lg bg-background/40 border border-border text-xs text-muted-foreground space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        Explanation & Feedback
                      </p>
                      <p className="text-muted-foreground/90">{qr.explanation}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

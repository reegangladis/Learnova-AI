import React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  HeartHandshake,
  Info,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { mlService } from "@/services/mlService";
import { ContributingFactor } from "@/types/ml";

export const LearningInsightsCard: React.FC = () => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ml-learning-insights"],
    queryFn: () => mlService.getLearningInsights(),
  });

  const getMomentumBadge = (momentum: string, isColdStart: boolean) => {
    if (isColdStart) {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs gap-1.5">
          <Sparkles className="h-3 w-3" />
          <span>New Learner</span>
        </Badge>
      );
    }

    switch (momentum) {
      case "accelerating":
        return (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1.5">
            <TrendingUp className="h-3 w-3" />
            <span>Accelerating Momentum</span>
          </Badge>
        );
      case "steady":
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-xs gap-1.5">
            <CheckCircle2 className="h-3 w-3" />
            <span>Steady Pace</span>
          </Badge>
        );
      case "needs_attention":
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1.5">
            <Clock className="h-3 w-3" />
            <span>Pacing Adjustment</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden" id="learning-insights-card">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Study Momentum & Guidance</CardTitle>
              <CardDescription className="text-xs">
                Adaptive pacing insights to help you maintain consistent curriculum momentum.
              </CardDescription>
            </div>
          </div>
          {data && getMomentumBadge(data.momentum_status, data.is_insufficient_data)}
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4 space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-3" role="status" aria-label="Loading insights">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-12 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        )}

        {isError && (
          <div className="p-4 text-center rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Unable to calculate study pacing guidance right now.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && data && (
          <div className="space-y-4">
            {/* Contributing Factors */}
            {data.contributing_factors.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                  Pacing Influences
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {data.contributing_factors.map((factor: ContributingFactor, idx: number) => {
                    const isPositive = factor.impact === "positive";
                    const isConcerning = factor.impact === "concerning";
                    return (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          isPositive
                            ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
                            : isConcerning
                            ? "border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-200"
                            : "border-border/60 bg-card text-foreground"
                        }`}
                      >
                        {isPositive ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : isConcerning ? (
                          <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold">{factor.factor_name}</p>
                          <p className="text-2xs text-muted-foreground mt-0.5">{factor.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Supportive Coaching Advice */}
            {data.supportive_guidance.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-2xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <HeartHandshake className="h-3 w-3 text-primary" />
                  <span>Personalized Study Tips</span>
                </h5>
                <ul className="space-y-1.5">
                  {data.supportive_guidance.map((tip: string, idx: number) => (
                    <li
                      key={idx}
                      className="p-2 rounded-lg bg-muted/40 border border-border/40 text-xs text-foreground flex items-start gap-2"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Non-punitive Coaching Disclaimer */}
            <div className="pt-2 border-t border-border/40 flex items-center gap-1.5 text-2xs text-muted-foreground">
              <Info className="h-3 w-3 shrink-0" />
              <span>
                These insights are supportive estimations to assist your personal study planning and never affect course access or grading.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

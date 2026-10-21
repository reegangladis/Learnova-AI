import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { mlService } from "@/services/mlService";
import { RecommendedCourseItem } from "@/types/ml";

interface CourseRecommendationsCardProps {
  limit?: number;
}

export const CourseRecommendationsCard: React.FC<CourseRecommendationsCardProps> = ({ limit = 3 }) => {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["ml-recommendations", limit],
    queryFn: () => mlService.getCourseRecommendations(limit),
  });

  const recommendations = data?.recommendations ?? [];

  const getStrategyBadge = (strategy: string) => {
    switch (strategy) {
      case "skill_gap_remediation":
        return (
          <Badge variant="default" className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-xs gap-1">
            <Target className="h-3 w-3" />
            <span>Skill Gap Remediation</span>
          </Badge>
        );
      case "goal_alignment":
        return (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Goal Alignment</span>
          </Badge>
        );
      case "content_based":
        return (
          <Badge variant="default" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            <span>Content Match</span>
          </Badge>
        );
      case "category_matching":
        return (
          <Badge variant="secondary" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 text-xs gap-1">
            <Compass className="h-3 w-3" />
            <span>Category Interest</span>
          </Badge>
        );
      case "popularity_fallback":
      default:
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>Popular Choice</span>
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-border/80 shadow-xs overflow-hidden" id="course-recommendations-card">
      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-base font-semibold">Recommended for You</CardTitle>
              <CardDescription className="text-xs">
                Personalized suggestions tailored to your curriculum progress and skills.
              </CardDescription>
            </div>
          </div>
          <Link to="/courses">
            <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
              <span>View All</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-4">
        {isLoading && (
          <div className="space-y-3" role="status" aria-label="Loading recommendations">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-4/5" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="p-4 text-center rounded-lg border border-border/60 bg-muted/20 space-y-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto" />
            <p className="text-xs text-muted-foreground">Unable to load recommendations at this time.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()} className="text-xs h-7">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !isError && recommendations.length === 0 && (
          <div className="p-6 text-center rounded-lg border border-dashed border-border/70 space-y-2">
            <BookOpen className="h-6 w-6 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">All caught up!</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              You are currently enrolled in all available courses in your track. Explore our broader catalog for upcoming programs.
            </p>
            <Link to="/courses">
              <Button size="sm" variant="outline" className="text-xs mt-2">
                Browse Full Catalog
              </Button>
            </Link>
          </div>
        )}

        {!isLoading && !isError && recommendations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((item: RecommendedCourseItem) => (
              <div
                key={item.course_id}
                className="group relative flex flex-col justify-between p-3.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:shadow-sm transition-all duration-200"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {getStrategyBadge(item.strategy)}
                    <Badge variant="outline" className="text-2xs capitalize py-0 h-5">
                      {item.difficulty}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.short_description}
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-muted/40 border border-border/40 text-2xs text-muted-foreground flex items-start gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.reason}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-2xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{item.duration_minutes}m</span>
                  </span>

                  <Link to={`/courses/${item.slug}`}>
                    <Button size="sm" variant="primary" className="h-7 text-xs px-2.5 gap-1">
                      <span>Explore</span>
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

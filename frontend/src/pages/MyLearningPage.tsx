import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap,
  PlayCircle,
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { learningService } from "@/services/learningService";

export function MyLearningPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "in_progress" | "completed">("all");

  const {
    data: enrollmentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => learningService.listMyEnrollments(),
  });

  const enrollments = enrollmentsData?.items || [];

  const filteredEnrollments = enrollments.filter((e) => {
    if (filter === "completed") {
      return e.status === "completed" || e.progress_percentage >= 100;
    }
    if (filter === "in_progress") {
      return e.status === "active" && e.progress_percentage < 100;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="h-7 w-7 text-primary" />
            My Learning
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your ongoing course progress, resume interactive lessons, and achieve certificates.
          </p>
        </div>

        <Link to="/courses">
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Browse Catalog
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          All Enrolled ({enrollments.length})
        </button>
        <button
          onClick={() => setFilter("in_progress")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "in_progress"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          In Progress ({enrollments.filter((e) => e.progress_percentage < 100).length})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === "completed"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Completed ({enrollments.filter((e) => e.progress_percentage >= 100).length})
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-xl border border-border bg-card p-5 space-y-4">
              <Skeleton className="h-40 w-full rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-6 bg-destructive/10 border border-destructive/20 rounded-xl text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-destructive">
            {error instanceof Error ? error.message : "Failed to load your enrolled courses."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && filteredEnrollments.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              {filter === "all"
                ? "No Enrolled Courses Yet"
                : filter === "completed"
                ? "No Completed Courses Yet"
                : "No Courses In Progress"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Explore our curriculum catalog to enroll in courses and begin personalized learning with AI.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/courses">
              <Button className="gap-2">
                Explore Catalog
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Enrollments Grid */}
      {!isLoading && !isError && filteredEnrollments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.map((enr) => {
            const course = enr.course;
            const isCompleted = enr.progress_percentage >= 100;

            return (
              <div
                key={enr.id}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card hover:border-primary/50 transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md"
              >
                <div>
                  {/* Thumbnail / Header */}
                  <div className="relative aspect-video w-full bg-muted overflow-hidden">
                    {course?.thumbnail_url ? (
                      <img
                        src={course.thumbnail_url}
                        alt={course.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                        <BookOpen className="h-12 w-12 opacity-80" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1 rounded-md bg-background/90 backdrop-blur-xs px-2.5 py-1 text-xs font-semibold text-foreground shadow-xs">
                        {course?.category?.name || "General"}
                      </span>
                    </div>

                    {isCompleted && (
                      <div className="absolute top-3 right-3">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/90 text-white backdrop-blur-xs px-2 py-0.5 text-xs font-semibold shadow-xs">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {course?.title || "Enrolled Course"}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course?.short_description || "No description provided."}
                      </p>
                    </div>

                    {/* Progress Bar & Lesson Count */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Course Progress</span>
                        <span className="text-foreground font-semibold">
                          {enr.progress_percentage}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, enr.progress_percentage))}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {enr.completed_lessons_count} of {enr.total_lessons_count} lessons
                        </span>
                        {course?.duration_minutes ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {course.duration_minutes}m
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <Button
                    onClick={() => navigate(`/learning/courses/${enr.course_id}`)}
                    className="w-full gap-2 shadow-xs"
                    variant={isCompleted ? "outline" : "primary"}
                  >
                    <PlayCircle className="h-4 w-4" />
                    {isCompleted ? "Review Course" : "Resume Learning"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

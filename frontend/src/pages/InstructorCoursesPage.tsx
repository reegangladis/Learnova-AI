import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlusCircle,
  BookOpen,
  Clock,
  Layers,
  Edit,
  Trash2,
  Send,
  Archive,
  AlertCircle,
  Eye,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { useAuth } from "@/hooks/useAuth";
import { Course } from "@/types/course";

export function InstructorCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [publishErrors, setPublishErrors] = useState<string[] | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  // Fetch instructor's courses
  const {
    data: coursesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["instructor-courses", user?.id, statusFilter],
    queryFn: () =>
      courseService.listCourses({
        instructor_id: user?.id,
        status: statusFilter || undefined,
        page_size: 50,
      }),
    enabled: !!user,
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: (courseId: string) => courseService.publishCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setPublishErrors(null);
    },
    onError: (err: unknown) => {
      const anyErr = err as { details?: { errors?: string[] }; message?: string };
      if (anyErr?.details?.errors && Array.isArray(anyErr.details.errors)) {
        setPublishErrors(anyErr.details.errors);
        return;
      }
      setPublishErrors([
        anyErr?.message || "Failed to publish course due to validation constraints.",
      ]);
    },
  });

  // Archive Mutation
  const archiveMutation = useMutation({
    mutationFn: (courseId: string) => courseService.archiveCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => courseService.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setCourseToDelete(null);
    },
  });

  const courses = coursesData?.items || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Instructor Studio
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Author, structure, and publish courses with complete control over curriculum modules.
          </p>
        </div>

        <Link to="/instructor/courses/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Create New Course
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {[
          { label: "All Courses", value: "" },
          { label: "Drafts", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Archived", value: "archived" },
        ].map((tab) => (
          <Button
            key={tab.value}
            variant={statusFilter === tab.value ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setStatusFilter(tab.value)}
            className="text-xs"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Publication Error Banner Modal */}
      {publishErrors && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 space-y-3 relative animate-in fade-in-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <AlertCircle className="h-5 w-5" />
              <span>Publication Completeness Requirements Not Met</span>
            </div>
            <button
              onClick={() => setPublishErrors(null)}
              className="text-destructive/70 hover:text-destructive p-1 rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            A course cannot be published until all mandatory learning components are satisfied:
          </p>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-destructive/90">
            {publishErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-8 text-center bg-card border border-border rounded-xl space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive font-medium">
            {error instanceof Error ? error.message : "Failed to load instructor courses."}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && courses.length === 0 && (
        <div className="text-center py-16 bg-card border border-border rounded-xl space-y-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
            <BookOpen className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Courses Found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {statusFilter
              ? `You don't have any courses with status '${statusFilter}'.`
              : "You haven't authored any courses yet. Click below to create your first course!"}
          </p>
          <Link to="/instructor/courses/new">
            <Button size="sm" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Start Authoring
            </Button>
          </Link>
        </div>
      )}

      {/* Course List Cards */}
      {!isLoading && !isError && courses.length > 0 && (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card
              key={course.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4 hover:border-primary/40 transition-colors"
            >
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      course.status === "published"
                        ? "default"
                        : course.status === "archived"
                          ? "outline"
                          : "secondary"
                    }
                    className="capitalize text-xs font-semibold"
                  >
                    {course.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {course.category?.name || "Uncategorized"}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {course.difficulty}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-foreground truncate">
                  <Link
                    to={`/instructor/courses/${course.id}/builder`}
                    className="hover:text-primary transition-colors"
                  >
                    {course.title}
                  </Link>
                </h3>

                <p className="text-xs text-muted-foreground line-clamp-1">
                  {course.short_description}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    {course.modules_count} Modules
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {course.lessons_count} Lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {course.duration_minutes} mins
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-border">
                {/* Curriculum Builder Button */}
                <Button
                  size="sm"
                  variant="primary"
                  className="gap-1.5 text-xs"
                  onClick={() => navigate(`/instructor/courses/${course.id}/builder`)}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Curriculum Builder
                </Button>

                {/* Edit metadata */}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                  onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit Info
                </Button>

                {/* Publish button */}
                {course.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                    onClick={() => publishMutation.mutate(course.id)}
                    disabled={publishMutation.isPending}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Publish
                  </Button>
                )}

                {/* Archive button */}
                {course.status === "published" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => archiveMutation.mutate(course.id)}
                    disabled={archiveMutation.isPending}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive
                  </Button>
                )}

                {/* View public */}
                <Link to={`/courses/${course.id}`}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="View details">
                    <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                </Link>

                {/* Delete course */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setCourseToDelete(course)}
                  title="Delete course"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-foreground">Confirm Deletion</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground">{courseToDelete.title}</strong>? All associated
              modules and lessons will also be removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCourseToDelete(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(courseToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

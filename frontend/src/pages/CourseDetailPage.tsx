import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  BookOpen,
  User,
  ArrowLeft,
  CheckCircle2,
  ListOrdered,
  FileText,
  Video,
  FileCode,
  ExternalLink,
  Edit,
  Layers,
  Eye,
  AlertCircle,
  X,
  GraduationCap,
  PlayCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { learningService } from "@/services/learningService";
import { useAuth } from "@/hooks/useAuth";
import { Lesson } from "@/types/course";

export function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasRole } = useAuth();
  const [selectedPreviewLesson, setSelectedPreviewLesson] = useState<Lesson | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const {
    data: course,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => courseService.getCourseDetail(courseId!),
    enabled: !!courseId,
  });

  // Query authenticated student's enrollments to check if already enrolled
  const { data: enrollmentsData } = useQuery({
    queryKey: ["my-enrollments"],
    queryFn: () => learningService.listMyEnrollments(),
    enabled: !!user,
  });

  const enrollment = enrollmentsData?.items?.find((e) => e.course_id === courseId);

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: () => learningService.enrollCourse(courseId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-enrollments"] });
      setEnrollError(null);
      navigate(`/learning/courses/${data.course_id}`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to enroll in this course.";
      setEnrollError(msg);
    },
  });

  const isOwnerOrAdmin =
    course &&
    user &&
    (hasRole("ADMIN", "SUPER_ADMIN") || user.id === course.instructor_id);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 md:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Course Unavailable</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "This course could not be loaded."}
        </p>
        <Button variant="outline" onClick={() => navigate("/courses")}>
          Return to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Back button & Action controls */}
      <div className="flex items-center justify-between">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Courses
        </Link>

        {isOwnerOrAdmin && (
          <div className="flex items-center gap-2">
            <Link to={`/instructor/courses/${course.id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="h-4 w-4" />
                Edit Metadata
              </Button>
            </Link>
            <Link to={`/instructor/courses/${course.id}/builder`}>
              <Button size="sm" className="gap-1.5">
                <Layers className="h-4 w-4" />
                Curriculum Builder
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Hero Banner Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <div className="space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{course.category?.name || "General"}</Badge>
            <Badge
              variant={
                course.difficulty === "beginner"
                  ? "default"
                  : course.difficulty === "intermediate"
                    ? "secondary"
                    : "outline"
              }
              className="capitalize"
            >
              {course.difficulty}
            </Badge>
            {course.status !== "published" && (
              <Badge variant="destructive" className="capitalize">
                {course.status}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">Language: {course.language.toUpperCase()}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {course.title}
          </h1>

          <p className="text-base text-muted-foreground leading-relaxed">
            {course.short_description}
          </p>

          <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-muted-foreground border-t border-border">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>
                Instructor:{" "}
                <strong className="text-foreground">
                  {course.instructor ? `${course.instructor.first_name} ${course.instructor.last_name}` : "Faculty"}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>
                Duration:{" "}
                <strong className="text-foreground">
                  {course.duration_minutes > 0 ? `${course.duration_minutes} mins` : "Self-paced"}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>
                Modules: <strong className="text-foreground">{course.modules.length}</strong> (
                {course.lessons_count} lessons)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Description & Curriculum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Overview & Objectives */}
        <div className="lg:col-span-2 space-y-6">
          {/* Syllabus Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About This Course</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-foreground/90">
                {course.description}
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          {course.learning_objectives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  What You'll Learn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {course.learning_objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                      <span className="text-foreground/90">{obj}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Prerequisites */}
          {course.prerequisites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ListOrdered className="h-5 w-5 text-primary" />
                  Prerequisites
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {course.prerequisites.map((prereq, i) => (
                    <li key={i} className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary mt-0.5 shrink-0" />
                      <span>{prereq}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right 1 Col: Enrollment Action & Curriculum Syllabus */}
        <div className="space-y-6">
          {/* Enrollment / Learning Action Card */}
          <Card className="border-primary/20 bg-card shadow-sm overflow-hidden">
            <CardHeader className="pb-3 border-b border-border bg-primary/5">
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>Learning Experience</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {enrollError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{enrollError}</span>
                </div>
              )}

              {enrollment ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Enrollment Status</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      Active Learner
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Course Progress</span>
                      <span>{enrollment.progress_percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${enrollment.progress_percentage}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {enrollment.completed_lessons_count} of {enrollment.total_lessons_count} lessons completed
                    </p>
                  </div>

                  <Button
                    onClick={() => navigate(`/learning/courses/${course.id}`)}
                    className="w-full gap-2 shadow-xs"
                  >
                    <PlayCircle className="h-4 w-4" />
                    {enrollment.progress_percentage > 0 ? "Resume Learning" : "Go to Classroom"}
                  </Button>
                </div>
              ) : course.status === "published" ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Enroll now to access complete module content, interactive video labs, and track your completion progress.
                    </p>
                  </div>

                  {user ? (
                    <Button
                      onClick={() => enrollMutation.mutate()}
                      disabled={enrollMutation.isPending}
                      className="w-full gap-2 shadow-xs"
                    >
                      <GraduationCap className="h-4 w-4" />
                      {enrollMutation.isPending ? "Enrolling..." : "Enroll in Course"}
                    </Button>
                  ) : (
                    <Link to="/login" className="block">
                      <Button className="w-full gap-2 shadow-xs">
                        Sign in to Enroll
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-muted/60 rounded-lg text-xs text-muted-foreground text-center">
                  This course is in <strong>{course.status}</strong> status and not currently open for enrollment.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Course Curriculum</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {course.modules.length} Modules
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {course.modules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Curriculum under active authoring.
                </p>
              ) : (
                course.modules.map((mod, modIdx) => (
                  <div key={mod.id} className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 p-3 font-semibold text-xs text-foreground flex items-center justify-between">
                      <span>
                        Module {modIdx + 1}: {mod.title}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal">
                        {mod.lessons.length} lessons
                      </span>
                    </div>

                    <div className="divide-y divide-border/60">
                      {mod.lessons.map((les) => (
                        <div
                          key={les.id}
                          className="p-3 text-xs flex items-center justify-between hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            {les.content_type === "video" ? (
                              <Video className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                            ) : les.content_type === "pdf" ? (
                              <FileCode className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            ) : les.content_type === "external_resource" ? (
                              <ExternalLink className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                            ) : (
                              <FileText className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate text-foreground/90 font-medium">
                              {les.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {les.duration_minutes > 0 && (
                              <span className="text-[11px] text-muted-foreground">
                                {les.duration_minutes}m
                              </span>
                            )}
                            {les.is_preview ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-1 text-primary"
                                onClick={() => setSelectedPreviewLesson(les)}
                              >
                                <Eye className="h-3 w-3" />
                                Preview
                              </Button>
                            ) : isOwnerOrAdmin ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] gap-1"
                                onClick={() => setSelectedPreviewLesson(les)}
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Lesson Preview Modal */}
      {selectedPreviewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <Badge variant="outline" className="capitalize text-[10px] mb-1">
                  {selectedPreviewLesson.content_type}
                </Badge>
                <h3 className="font-semibold text-base text-foreground">
                  {selectedPreviewLesson.title}
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSelectedPreviewLesson(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {selectedPreviewLesson.description && (
                <p className="text-xs text-muted-foreground">
                  {selectedPreviewLesson.description}
                </p>
              )}

              {selectedPreviewLesson.content_type === "text" && selectedPreviewLesson.text_content ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line bg-muted/30 p-4 rounded-lg border border-border">
                  {selectedPreviewLesson.text_content}
                </div>
              ) : selectedPreviewLesson.resource_url ? (
                <div className="p-4 bg-muted/40 rounded-lg border border-border space-y-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    Multimedia Resource Reference:
                  </p>
                  <a
                    href={selectedPreviewLesson.resource_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium break-all"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {selectedPreviewLesson.resource_url}
                  </a>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-6">
                  Content preview is not available for this lesson.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-border flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPreviewLesson(null)}
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

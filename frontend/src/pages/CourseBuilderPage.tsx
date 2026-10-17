import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Send,
  Eye,
  FileText,
  Video,
  FileCode,
  ExternalLink,
  Layers,
  AlertCircle,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import {
  CourseModule,
  Lesson,
  LessonContentType,
  LessonCreatePayload,
  LessonUpdatePayload,
} from "@/types/course";
import { APIClientError } from "@/services/apiClient";

export function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetModuleId, setTargetModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonDescription, setLessonDescription] = useState("");
  const [lessonContentType, setLessonContentType] = useState<LessonContentType>("text");
  const [lessonTextContent, setLessonTextContent] = useState("");
  const [lessonResourceUrl, setLessonResourceUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState(10);
  const [lessonIsPreview, setLessonIsPreview] = useState(false);

  const [publishErrors, setPublishErrors] = useState<string[] | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch course details with modules & lessons
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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
  };

  // Module Mutations
  const createModuleMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      courseService.createModule(courseId!, data),
    onSuccess: () => {
      invalidate();
      closeModuleModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const updateModuleMutation = useMutation({
    mutationFn: (data: { moduleId: string; title: string; description?: string }) =>
      courseService.updateModule(data.moduleId, {
        title: data.title,
        description: data.description,
      }),
    onSuccess: () => {
      invalidate();
      closeModuleModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: string) => courseService.deleteModule(moduleId),
    onSuccess: () => invalidate(),
  });

  const reorderModuleMutation = useMutation({
    mutationFn: (data: { moduleId: string; orderIndex: number }) =>
      courseService.reorderModule(data.moduleId, data.orderIndex),
    onSuccess: () => invalidate(),
  });

  // Lesson Mutations
  const createLessonMutation = useMutation({
    mutationFn: (data: { moduleId: string; payload: LessonCreatePayload }) =>
      courseService.createLesson(data.moduleId, data.payload),
    onSuccess: () => {
      invalidate();
      closeLessonModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const updateLessonMutation = useMutation({
    mutationFn: (data: { lessonId: string; payload: LessonUpdatePayload }) =>
      courseService.updateLesson(data.lessonId, data.payload),
    onSuccess: () => {
      invalidate();
      closeLessonModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => courseService.deleteLesson(lessonId),
    onSuccess: () => invalidate(),
  });

  const reorderLessonMutation = useMutation({
    mutationFn: (data: { lessonId: string; orderIndex: number }) =>
      courseService.reorderLesson(data.lessonId, data.orderIndex),
    onSuccess: () => invalidate(),
  });

  // Publish Mutation
  const publishMutation = useMutation({
    mutationFn: () => courseService.publishCourse(courseId!),
    onSuccess: () => {
      invalidate();
      setPublishErrors(null);
    },
    onError: (err: unknown) => {
      if (err instanceof APIClientError && err.details) {
        const details = err.details as { errors?: string[] };
        if (details.errors && Array.isArray(details.errors)) {
          setPublishErrors(details.errors);
          return;
        }
      }
      setPublishErrors([
        err instanceof Error ? err.message : "Course failed publishing completeness requirements.",
      ]);
    },
  });

  // Modal helpers
  const openCreateModuleModal = () => {
    setEditingModule(null);
    setModuleTitle("");
    setModuleDescription("");
    setModalError(null);
    setIsModuleModalOpen(true);
  };

  const openEditModuleModal = (mod: CourseModule) => {
    setEditingModule(mod);
    setModuleTitle(mod.title);
    setModuleDescription(mod.description || "");
    setModalError(null);
    setIsModuleModalOpen(true);
  };

  const closeModuleModal = () => {
    setIsModuleModalOpen(false);
    setEditingModule(null);
    setModalError(null);
  };

  const openCreateLessonModal = (moduleId: string) => {
    setTargetModuleId(moduleId);
    setEditingLesson(null);
    setLessonTitle("");
    setLessonDescription("");
    setLessonContentType("text");
    setLessonTextContent("");
    setLessonResourceUrl("");
    setLessonDuration(10);
    setLessonIsPreview(false);
    setModalError(null);
    setIsLessonModalOpen(true);
  };

  const openEditLessonModal = (moduleId: string, lesson: Lesson) => {
    setTargetModuleId(moduleId);
    setEditingLesson(lesson);
    setLessonTitle(lesson.title);
    setLessonDescription(lesson.description || "");
    setLessonContentType(lesson.content_type);
    setLessonTextContent(lesson.text_content || "");
    setLessonResourceUrl(lesson.resource_url || "");
    setLessonDuration(lesson.duration_minutes || 0);
    setLessonIsPreview(lesson.is_preview);
    setModalError(null);
    setIsLessonModalOpen(true);
  };

  const closeLessonModal = () => {
    setIsLessonModalOpen(false);
    setTargetModuleId(null);
    setEditingLesson(null);
    setModalError(null);
  };

  const handleSaveModule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!moduleTitle.trim()) {
      setModalError("Module title is required.");
      return;
    }
    if (editingModule) {
      updateModuleMutation.mutate({
        moduleId: editingModule.id,
        title: moduleTitle.trim(),
        description: moduleDescription.trim() || undefined,
      });
    } else {
      createModuleMutation.mutate({
        title: moduleTitle.trim(),
        description: moduleDescription.trim() || undefined,
      });
    }
  };

  const handleSaveLesson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonTitle.trim()) {
      setModalError("Lesson title is required.");
      return;
    }

    if (lessonContentType === "text" && !lessonTextContent.trim()) {
      setModalError("Text content is required for text lessons.");
      return;
    }

    if (lessonContentType !== "text" && !lessonResourceUrl.trim()) {
      setModalError(`Resource URL is required for ${lessonContentType} lessons.`);
      return;
    }

    const payload = {
      title: lessonTitle.trim(),
      description: lessonDescription.trim() || undefined,
      content_type: lessonContentType,
      text_content: lessonContentType === "text" ? lessonTextContent.trim() : undefined,
      resource_url: lessonContentType !== "text" ? lessonResourceUrl.trim() : undefined,
      duration_minutes: lessonDuration,
      is_preview: lessonIsPreview,
    };

    if (editingLesson) {
      updateLessonMutation.mutate({
        lessonId: editingLesson.id,
        payload,
      });
    } else if (targetModuleId) {
      createLessonMutation.mutate({
        moduleId: targetModuleId,
        payload,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !course) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Course Not Found</h2>
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : "Error"}</p>
        <Link to="/instructor/courses">
          <Button variant="outline">Return to Instructor Studio</Button>
        </Link>
      </div>
    );
  }

  const modules = course.modules || [];
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/instructor/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Studio
        </Link>

        <div className="flex items-center gap-2">
          <Link to={`/courses/${course.id}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Eye className="h-4 w-4" />
              Preview Public Page
            </Button>
          </Link>
          <Link to={`/instructor/courses/${course.id}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit2 className="h-4 w-4" />
              Edit Info
            </Button>
          </Link>
          {course.status !== "published" && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => publishMutation.mutate()}
              disabled={publishMutation.isPending}
            >
              <Send className="h-4 w-4" />
              {publishMutation.isPending ? "Validating..." : "Publish Course"}
            </Button>
          )}
        </div>
      </div>

      {/* Course Header Banner */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
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
                {course.category?.name || "No Category"}
              </Badge>
              <span className="text-xs text-muted-foreground capitalize">
                {course.difficulty}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {course.short_description}
            </p>
          </div>

          <div className="flex sm:flex-col items-end gap-1 text-xs text-muted-foreground shrink-0">
            <span>
              <strong>{modules.length}</strong> Modules
            </span>
            <span>
              <strong>{totalLessons}</strong> Lessons
            </span>
          </div>
        </div>
      </Card>

      {/* Publishing Validation Errors Alert */}
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
            Please resolve the following required fields before publishing:
          </p>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-destructive/90">
            {publishErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Curriculum Builder Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">Curriculum Modules</h2>
            <p className="text-xs text-muted-foreground">
              Add modules and lessons in instructional order. Reorder items using the arrows.
            </p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreateModuleModal}>
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
        </div>

        {modules.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Modules Created Yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Start structuring your course by adding your first instructional module.
            </p>
            <Button size="sm" onClick={openCreateModuleModal} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add First Module
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {modules.map((mod, modIdx) => (
              <Card key={mod.id} className="overflow-hidden border-border/80">
                {/* Module Header */}
                <div className="bg-muted/30 p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        Module {modIdx + 1}: {mod.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({mod.lessons.length} {mod.lessons.length === 1 ? "lesson" : "lessons"})
                      </span>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {mod.description}
                      </p>
                    )}
                  </div>

                  {/* Module Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={modIdx === 0 || reorderModuleMutation.isPending}
                      onClick={() =>
                        reorderModuleMutation.mutate({
                          moduleId: mod.id,
                          orderIndex: modIdx - 1,
                        })
                      }
                      title="Move module up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={modIdx === modules.length - 1 || reorderModuleMutation.isPending}
                      onClick={() =>
                        reorderModuleMutation.mutate({
                          moduleId: mod.id,
                          orderIndex: modIdx + 1,
                        })
                      }
                      title="Move module down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditModuleModal(mod)}
                      title="Edit module"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive"
                      onClick={() => deleteModuleMutation.mutate(mod.id)}
                      title="Delete module"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 ml-2"
                      onClick={() => openCreateLessonModal(mod.id)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Lesson
                    </Button>
                  </div>
                </div>

                {/* Module Lessons List */}
                <CardContent className="p-0">
                  {mod.lessons.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground italic">
                      No lessons in this module. Click 'Add Lesson' above to author content.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {mod.lessons.map((les, lesIdx) => (
                        <div
                          key={les.id}
                          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {les.content_type === "video" ? (
                              <Video className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : les.content_type === "pdf" ? (
                              <FileCode className="h-4 w-4 text-amber-500 shrink-0" />
                            ) : les.content_type === "external_resource" ? (
                              <ExternalLink className="h-4 w-4 text-violet-500 shrink-0" />
                            ) : (
                              <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}

                            <div className="space-y-0.5 truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-xs text-foreground truncate">
                                  {lesIdx + 1}. {les.title}
                                </span>
                                {les.is_preview && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-primary border-primary/30">
                                    Preview
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                <span className="capitalize">{les.content_type}</span>
                                {les.duration_minutes > 0 && <span>• {les.duration_minutes}m</span>}
                                {les.resource_url && (
                                  <span className="truncate max-w-xs text-primary/80">
                                    • {les.resource_url}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Lesson Actions */}
                          <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={lesIdx === 0 || reorderLessonMutation.isPending}
                              onClick={() =>
                                reorderLessonMutation.mutate({
                                  lessonId: les.id,
                                  orderIndex: lesIdx - 1,
                                })
                              }
                              title="Move lesson up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              disabled={
                                lesIdx === mod.lessons.length - 1 ||
                                reorderLessonMutation.isPending
                              }
                              onClick={() =>
                                reorderLessonMutation.mutate({
                                  lessonId: les.id,
                                  orderIndex: lesIdx + 1,
                                })
                              }
                              title="Move lesson down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => openEditLessonModal(mod.id, les)}
                              title="Edit lesson"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive/80 hover:text-destructive"
                              onClick={() => deleteLessonMutation.mutate(les.id)}
                              title="Delete lesson"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Module Modal */}
      {isModuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground">
                {editingModule ? "Edit Module" : "Add New Module"}
              </h3>
              <button onClick={closeModuleModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveModule} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Module Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Asynchronous Database Drivers"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Summary of module objectives..."
                  value={moduleDescription}
                  onChange={(e) => setModuleDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={closeModuleModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                >
                  {createModuleMutation.isPending || updateModuleMutation.isPending
                    ? "Saving..."
                    : "Save Module"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingLesson ? "Edit Lesson" : "Add Lesson"}
              </h3>
              <button onClick={closeLessonModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveLesson} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Lesson Title <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Async Engine Connection Pools"
                  value={lessonTitle}
                  onChange={(e) => setLessonTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Content Type</label>
                  <select
                    aria-label="Content Type"
                    value={lessonContentType}
                    onChange={(e) => setLessonContentType(e.target.value as LessonContentType)}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring capitalize"
                  >
                    <option value="text">Text (Markdown / Article)</option>
                    <option value="video">Video URL Reference</option>
                    <option value="pdf">PDF Document Reference</option>
                    <option value="external_resource">External Resource Reference</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Duration (Minutes)</label>
                  <Input
                    type="number"
                    min={0}
                    value={lessonDuration}
                    onChange={(e) => setLessonDuration(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              {/* Dynamic content field based on content type */}
              {lessonContentType === "text" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Lesson Text Content (Markdown) <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    rows={6}
                    placeholder="Enter full lesson markdown body..."
                    value={lessonTextContent}
                    onChange={(e) => setLessonTextContent(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Resource Reference URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="https://cdn.example.com/materials/lesson-asset.mp4"
                    value={lessonResourceUrl}
                    onChange={(e) => setLessonResourceUrl(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    HTTPS, S3, or CDN asset reference. No raw binary blobs are stored in PostgreSQL.
                  </p>
                </div>
              )}

              {/* Preview Flag Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="preview-flag"
                  checked={lessonIsPreview}
                  onChange={(e) => setLessonIsPreview(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="preview-flag" className="text-xs font-medium text-foreground cursor-pointer">
                  Make this lesson freely previewable without enrollment
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={closeLessonModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createLessonMutation.isPending || updateLessonMutation.isPending}
                >
                  {createLessonMutation.isPending || updateLessonMutation.isPending
                    ? "Saving..."
                    : "Save Lesson"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

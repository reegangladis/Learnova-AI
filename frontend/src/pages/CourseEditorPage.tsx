import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { CourseCreatePayload, CourseDifficulty, CourseUpdatePayload } from "@/types/course";

export function CourseEditorPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const isEditing = !!courseId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Form State
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [difficulty, setDifficulty] = useState<CourseDifficulty>("beginner");
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [language, setLanguage] = useState("en");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [learningObjectives, setLearningObjectives] = useState<string[]>([""]);
  const [prerequisites, setPrerequisites] = useState<string[]>([""]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch Categories
  const { data: categories = [] } = useQuery({
    queryKey: ["course-categories-active"],
    queryFn: () => courseService.listCategories(true),
  });

  // If editing, fetch course detail
  const { data: existingCourse, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: () => courseService.getCourseDetail(courseId!),
    enabled: isEditing,
  });

  useEffect(() => {
    if (existingCourse) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(existingCourse.title || "");
      setSlug(existingCourse.slug || "");
      setShortDescription(existingCourse.short_description || "");
      setDescription(existingCourse.description || "");
      setCategoryId(existingCourse.category_id || "");
      setDifficulty(existingCourse.difficulty || "beginner");
      setDurationMinutes(existingCourse.duration_minutes || 0);
      setLanguage(existingCourse.language || "en");
      setThumbnailUrl(existingCourse.thumbnail_url || "");
      setLearningObjectives(
        existingCourse.learning_objectives.length > 0
          ? existingCourse.learning_objectives
          : [""]
      );
      setPrerequisites(
        existingCourse.prerequisites.length > 0
          ? existingCourse.prerequisites
          : [""]
      );
    }
  }, [existingCourse]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CourseCreatePayload) => courseService.createCourse(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      navigate(`/instructor/courses/${data.id}/builder`);
    },
    onError: (err: Error) => {
      setServerError(err.message || "Failed to create course.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CourseUpdatePayload) =>
      courseService.updateCourse(courseId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-courses"] });
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
      navigate(`/instructor/courses/${courseId}/builder`);
    },
    onError: (err: Error) => {
      setServerError(err.message || "Failed to update course.");
    },
  });

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!title.trim() || title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters long.";
    }
    if (!shortDescription.trim() || shortDescription.trim().length < 10) {
      errors.shortDescription = "Short description must be at least 10 characters.";
    }
    if (!description.trim() || description.trim().length < 10) {
      errors.description = "Full syllabus description must be at least 10 characters.";
    }
    if (!categoryId) {
      errors.categoryId = "Please select a category.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const filteredObjectives = learningObjectives.map((o) => o.trim()).filter(Boolean);
    const filteredPrerequisites = prerequisites.map((p) => p.trim()).filter(Boolean);

    if (isEditing) {
      updateMutation.mutate({
        title: title.trim(),
        slug: slug.trim() || undefined,
        short_description: shortDescription.trim(),
        description: description.trim(),
        category_id: categoryId || undefined,
        difficulty,
        duration_minutes: durationMinutes,
        language: language.trim() || "en",
        thumbnail_url: thumbnailUrl.trim() || undefined,
        learning_objectives: filteredObjectives,
        prerequisites: filteredPrerequisites,
      });
    } else {
      createMutation.mutate({
        title: title.trim(),
        slug: slug.trim() || undefined,
        short_description: shortDescription.trim(),
        description: description.trim(),
        category_id: categoryId || undefined,
        difficulty,
        duration_minutes: durationMinutes,
        language: language.trim() || "en",
        thumbnail_url: thumbnailUrl.trim() || undefined,
        learning_objectives: filteredObjectives,
        prerequisites: filteredPrerequisites,
      });
    }
  };

  if (isEditing && isLoadingCourse) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Navigation & Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/instructor/courses"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Instructor Studio
        </Link>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {isEditing ? "Edit Course Metadata" : "Create New Course"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEditing
            ? "Update course syllabus, category assignment, and learning requirements."
            : "Define the core attributes for your course before building modules and lessons."}
        </p>
      </div>

      {serverError && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3 text-destructive text-sm font-medium">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Core Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Course Title <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Distributed Systems & High-Concurrency APIs"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {formErrors.title && (
                <p className="text-xs text-destructive">{formErrors.title}</p>
              )}
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                URL Slug <span className="text-muted-foreground font-normal">(Optional - auto-generated if left blank)</span>
              </label>
              <Input
                placeholder="distributed-systems-apis"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>

            {/* Short Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Short Description (Catalog Summary) <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Concise 1-2 sentence overview shown on catalog preview cards"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
              {formErrors.shortDescription && (
                <p className="text-xs text-destructive">{formErrors.shortDescription}</p>
              )}
            </div>

            {/* Full Syllabus Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Full Description & Syllabus <span className="text-destructive">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Detailed curriculum overview, target audience, and methodologies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {formErrors.description && (
                <p className="text-xs text-destructive">{formErrors.description}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Classification & Logistics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                aria-label="Course Category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select a category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formErrors.categoryId && (
                <p className="text-xs text-destructive">{formErrors.categoryId}</p>
              )}
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Difficulty Level</label>
              <select
                aria-label="Difficulty Level"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as CourseDifficulty)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring capitalize"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Estimated Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Estimated Duration (Minutes)</label>
              <Input
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Instructional Language</label>
              <Input
                placeholder="en"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>

            {/* Thumbnail URL */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Thumbnail Banner Image URL</label>
              <Input
                placeholder="https://cdn.example.com/thumbnails/course-banner.jpg"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Learning Objectives */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Learning Objectives</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setLearningObjectives([...learningObjectives, ""])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Objective
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {learningObjectives.map((obj, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Learning objective #${idx + 1}`}
                  value={obj}
                  onChange={(e) => {
                    const updated = [...learningObjectives];
                    updated[idx] = e.target.value;
                    setLearningObjectives(updated);
                  }}
                />
                {learningObjectives.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setLearningObjectives(learningObjectives.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Dynamic Prerequisites */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Course Prerequisites</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setPrerequisites([...prerequisites, ""])}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Prerequisite
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {prerequisites.map((pre, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder={`Prerequisite #${idx + 1}`}
                  value={pre}
                  onChange={(e) => {
                    const updated = [...prerequisites];
                    updated[idx] = e.target.value;
                    setPrerequisites(updated);
                  }}
                />
                {prerequisites.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setPrerequisites(prerequisites.filter((_, i) => i !== idx));
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <CardFooter className="flex justify-end gap-3 px-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/instructor/courses")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="gap-2"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending || updateMutation.isPending
              ? "Saving..."
              : isEditing
                ? "Save Changes"
                : "Create & Open Builder"}
          </Button>
        </CardFooter>
      </form>
    </div>
  );
}

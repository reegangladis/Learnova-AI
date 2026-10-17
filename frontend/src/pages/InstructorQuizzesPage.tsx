import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileQuestion,
  Plus,
  Search,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  Archive,
  Trash2,
  Edit,
} from "lucide-react";

import { quizService } from "@/services/quizService";
import { courseService } from "@/services/courseService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const createQuizSchema = z.object({
  course_id: z.string().min(1, "Please select an associated course."),
  title: z.string().min(3, "Title must be at least 3 characters.").max(255),
  description: z.string().optional(),
  instructions: z.string().optional(),
  duration_minutes: z.coerce.number().min(0).default(0),
  passing_score_percentage: z.coerce.number().min(0).max(100).default(70),
  max_attempts: z.coerce.number().min(0).default(1),
  shuffle_questions: z.boolean().default(false),
  shuffle_options: z.boolean().default(false),
});

type CreateQuizFormValues = z.infer<typeof createQuizSchema>;

export function InstructorQuizzesPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Instructor Quizzes
  const { data: quizzesData, isLoading } = useQuery({
    queryKey: ["instructor_quizzes"],
    queryFn: () => quizService.listInstructorQuizzes(),
  });

  // 2. Fetch Instructor Courses for assignment in creation modal
  const { data: coursesData } = useQuery({
    queryKey: ["instructor_courses"],
    queryFn: () => courseService.listCourses({ page_size: 100 }),
  });

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateQuizFormValues>({
    resolver: zodResolver(createQuizSchema),
    defaultValues: {
      course_id: "",
      title: "",
      description: "",
      instructions: "",
      duration_minutes: 20,
      passing_score_percentage: 70,
      max_attempts: 2,
      shuffle_questions: false,
      shuffle_options: false,
    },
  });

  // Mutations
  const createQuizMutation = useMutation({
    mutationFn: (values: CreateQuizFormValues) => quizService.createQuiz(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor_quizzes"] });
      setIsCreateModalOpen(false);
      reset();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to create quiz.");
    },
  });

  const publishMutation = useMutation({
    mutationFn: (quizId: string) => quizService.publishQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor_quizzes"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to publish quiz.");
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (quizId: string) => quizService.archiveQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor_quizzes"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to archive quiz.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (quizId: string) => quizService.deleteQuiz(quizId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor_quizzes"] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to delete quiz.");
    },
  });

  const handleCreateSubmit = (data: CreateQuizFormValues) => {
    setActionError(null);
    createQuizMutation.mutate(data);
  };

  const quizzes = quizzesData?.items || [];

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesStatus = selectedStatus === "all" || quiz.status === selectedStatus;
    const matchesSearch =
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quiz.description && quiz.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalQuizzes = quizzes.length;
  const publishedCount = quizzes.filter((q) => q.status === "published").length;
  const draftCount = quizzes.filter((q) => q.status === "draft").length;
  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.question_count || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">
              Assessment Studio
            </Badge>
            <span className="text-xs text-muted-foreground">• Phase 5 Active</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-2">
            Quiz & Assessment Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Author quizzes, configure multiple-choice & true/false questions, and set scoring rules.
          </p>
        </div>
        <Button
          id="btn-create-quiz"
          variant="primary"
          onClick={() => {
            setActionError(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Quiz
        </Button>
      </div>

      {/* Global Action Alert */}
      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Action Failed</p>
            <p className="mt-0.5">{actionError}</p>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Quizzes
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">{totalQuizzes}</p>
            </div>
            <FileQuestion className="w-8 h-8 text-indigo-400 opacity-60" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Published
              </p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{publishedCount}</p>
            </div>
            <CheckCircle2 className="w-8 h-8 text-emerald-400 opacity-60" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                In Draft
              </p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{draftCount}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-400 opacity-60" />
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Total Questions
              </p>
              <p className="text-2xl font-bold text-cyan-400 mt-1">{totalQuestions}</p>
            </div>
            <Award className="w-8 h-8 text-cyan-400 opacity-60" />
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 border border-border bg-card/60 rounded-lg p-1">
          {["all", "draft", "published", "archived"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors capitalize ${
                selectedStatus === st
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/50"
          />
        </div>
      </div>

      {/* Quizzes List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-card/40 animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredQuizzes.length === 0 ? (
        <Card className="border-dashed border-border bg-card/30 p-12 text-center">
          <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <h3 className="text-lg font-bold text-foreground">No Quizzes Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            {searchQuery || selectedStatus !== "all"
              ? "No quizzes match your current filter criteria."
              : "Create your first quiz to evaluate student learning across your courses."}
          </p>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-5 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create First Quiz
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredQuizzes.map((quiz) => (
            <Card
              key={quiz.id}
              className="border-border bg-card/60 hover:bg-card/90 transition-all hover:border-indigo-500/30"
            >
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${
                        quiz.status === "published"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : quiz.status === "archived"
                          ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {quiz.status}
                    </span>
                    <h3 className="text-lg font-bold text-foreground">{quiz.title}</h3>
                  </div>

                  {quiz.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{quiz.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1.5">
                      <FileQuestion className="w-3.5 h-3.5 text-indigo-400" />
                      {quiz.question_count} {quiz.question_count === 1 ? "Question" : "Questions"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      {quiz.total_points} Points
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins` : "Untimed"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      Pass: {quiz.passing_score_percentage}%
                    </span>
                    <span>
                      Attempts: {quiz.max_attempts > 0 ? quiz.max_attempts : "Unlimited"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link to={`/instructor/quizzes/${quiz.id}/builder`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                      <Edit className="w-3.5 h-3.5" />
                      Question Builder
                    </Button>
                  </Link>

                  {quiz.status === "draft" && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => publishMutation.mutate(quiz.id)}
                      disabled={publishMutation.isPending}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Publish
                    </Button>
                  )}

                  {quiz.status === "published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => archiveMutation.mutate(quiz.id)}
                      disabled={archiveMutation.isPending}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-white"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </Button>
                  )}

                  {quiz.status === "draft" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete quiz "${quiz.title}"?`)) {
                          deleteMutation.mutate(quiz.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Quiz Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-xl font-bold text-foreground">Create New Quiz</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(handleCreateSubmit)} className="space-y-4">
              {/* Course Selection */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Assign to Course *
                </label>
                <select
                  {...register("course_id")}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                >
                  <option value="">Select a course...</option>
                  {(coursesData?.items || []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {errors.course_id && (
                  <p className="text-xs text-destructive mt-1">{errors.course_id.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Quiz Title *
                </label>
                <Input
                  {...register("title")}
                  placeholder="e.g. Midterm Assessment: TypeScript"
                  className="bg-background"
                />
                {errors.title && (
                  <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  placeholder="Briefly describe what this quiz evaluates..."
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Settings Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Duration (mins)
                  </label>
                  <Input
                    type="number"
                    {...register("duration_minutes")}
                    placeholder="0 = untimed"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Pass Score (%)
                  </label>
                  <Input
                    type="number"
                    {...register("passing_score_percentage")}
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Max Attempts
                  </label>
                  <Input
                    type="number"
                    {...register("max_attempts")}
                    placeholder="0 = unlimited"
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || createQuizMutation.isPending}
                >
                  {isSubmitting || createQuizMutation.isPending ? "Creating..." : "Create Draft Quiz"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

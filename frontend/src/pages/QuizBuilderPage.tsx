import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileQuestion,
  Plus,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  Trash2,
  Edit,
  Check,
  Sparkles,
} from "lucide-react";

import { quizService } from "@/services/quizService";
import { QuestionType, QuizQuestionCreate, QuestionOptionCreate } from "@/types/quiz";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function QuizBuilderPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const queryClient = useQueryClient();

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Question Form State
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("single_choice");
  const [points, setPoints] = useState(1);
  const [explanation, setExplanation] = useState("");
  const [options, setOptions] = useState<QuestionOptionCreate[]>([
    { option_text: "", is_correct: true, explanation: "" },
    { option_text: "", is_correct: false, explanation: "" },
  ]);

  // Fetch Quiz Detail
  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ["quiz_builder", quizId],
    queryFn: () => quizService.getQuiz(quizId!),
    enabled: !!quizId,
  });

  // Mutations
  const publishMutation = useMutation({
    mutationFn: () => quizService.publishQuiz(quizId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_builder", quizId] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to publish quiz.");
    },
  });

  const saveQuestionMutation = useMutation({
    mutationFn: async (payload: QuizQuestionCreate) => {
      if (editingQuestionId) {
        return quizService.updateQuestion(quizId!, editingQuestionId, payload);
      }
      return quizService.addQuestion(quizId!, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_builder", quizId] });
      closeQuestionModal();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to save question.");
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (questionId: string) => quizService.deleteQuestion(quizId!, questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz_builder", quizId] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.response?.data?.error?.message || err.message || "Failed to delete question.");
    },
  });

  const openAddModal = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType("single_choice");
    setPoints(1);
    setExplanation("");
    setOptions([
      { option_text: "", is_correct: true, explanation: "" },
      { option_text: "", is_correct: false, explanation: "" },
    ]);
    setActionError(null);
    setIsQuestionModalOpen(true);
  };

  const openEditModal = (q: any) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.question_text);
    setQuestionType(q.question_type);
    setPoints(q.points);
    setExplanation(q.explanation || "");
    setOptions(
      q.options.map((opt: any) => ({
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        explanation: opt.explanation || "",
      }))
    );
    setActionError(null);
    setIsQuestionModalOpen(true);
  };

  const closeQuestionModal = () => {
    setIsQuestionModalOpen(false);
    setEditingQuestionId(null);
  };

  const handleOptionCorrectToggle = (index: number) => {
    if (questionType === "single_choice" || questionType === "true_false") {
      setOptions((prev) =>
        prev.map((opt, i) => ({
          ...opt,
          is_correct: i === index,
        }))
      );
    } else {
      // multiple_select
      setOptions((prev) =>
        prev.map((opt, i) => (i === index ? { ...opt, is_correct: !opt.is_correct } : opt))
      );
    }
  };

  const handleOptionTextChange = (index: number, text: string) => {
    setOptions((prev) =>
      prev.map((opt, i) => (i === index ? { ...opt, option_text: text } : opt))
    );
  };

  const addOption = () => {
    setOptions((prev) => [
      ...prev,
      { option_text: "", is_correct: false, explanation: "" },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) {
      alert("A question must have at least 2 options.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setActionError("Question text cannot be empty.");
      return;
    }
    if (options.some((o) => !o.option_text.trim())) {
      setActionError("All answer options must have text.");
      return;
    }
    const correctCount = options.filter((o) => o.is_correct).length;
    if (questionType === "single_choice" || questionType === "true_false") {
      if (correctCount !== 1) {
        setActionError("Please select exactly one correct answer.");
        return;
      }
    } else if (questionType === "multiple_select") {
      if (correctCount < 1) {
        setActionError("Please select at least one correct answer.");
        return;
      }
    }

    saveQuestionMutation.mutate({
      question_text: questionText.trim(),
      question_type: questionType,
      points,
      explanation: explanation.trim() || undefined,
      is_required: true,
      options,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-48 bg-card/40 rounded-lg animate-pulse" />
        <div className="h-64 bg-card/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Quiz Not Found</h2>
        <Link to="/instructor/quizzes">
          <Button variant="outline">Back to Quizzes</Button>
        </Link>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const hasQuestions = questions.length > 0;
  const totalPoints = quiz.total_points || 0;
  const isPublishable = hasQuestions && totalPoints > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Header */}
      <div className="space-y-4 border-b border-border pb-6">
        <Link
          to="/instructor/quizzes"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Quiz Studio
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 capitalize">
                {quiz.status}
              </Badge>
              <span className="text-xs text-muted-foreground">• Curriculum Assessment</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mt-2">
              {quiz.title}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {quiz.description || "Build and configure questions for this assessment."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              id="btn-add-question"
              variant="outline"
              onClick={openAddModal}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </Button>

            {quiz.status === "draft" && (
              <Button
                id="btn-publish-quiz"
                variant="primary"
                onClick={() => publishMutation.mutate()}
                disabled={publishMutation.isPending || !isPublishable}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 className="w-4 h-4" />
                {publishMutation.isPending ? "Publishing..." : "Publish Quiz"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {actionError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Operation Failed</p>
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

      {/* Publishing Readiness Checklist */}
      <Card className="bg-card/40 border-border">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Publishing Checklist:
            </span>
            <span className={`flex items-center gap-1.5 ${hasQuestions ? "text-emerald-400" : "text-muted-foreground"}`}>
              {hasQuestions ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {questions.length} Questions (Min 1)
            </span>
            <span className={`flex items-center gap-1.5 ${totalPoints > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
              {totalPoints > 0 ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
              {totalPoints} Total Points
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Clock className="w-3.5 h-3.5" />
              {quiz.duration_minutes > 0 ? `${quiz.duration_minutes} Mins Limit` : "Untimed"}
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Award className="w-3.5 h-3.5" />
              Passing Score: {quiz.passing_score_percentage}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            Questions ({questions.length})
          </h2>
        </div>

        {questions.length === 0 ? (
          <Card className="border-dashed border-border bg-card/20 p-12 text-center">
            <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-bold text-foreground">No Questions Added Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Add your first question to populate this assessment. Support includes Single Choice, True/False, and Multiple Select.
            </p>
            <Button
              variant="primary"
              onClick={openAddModal}
              className="mt-5 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add First Question
            </Button>
          </Card>
        ) : (
          questions.map((q, qIndex) => (
            <Card key={q.id} className="border-border bg-card/60">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 text-xs font-bold flex-shrink-0">
                      {qIndex + 1}
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-foreground">{q.question_text}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize font-medium text-indigo-400">
                          {q.question_type ? q.question_type.replace("_", " ") : "single choice"}
                        </span>
                        <span>•</span>
                        <span>{q.points} {q.points === 1 ? "Point" : "Points"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(q)}
                      className="flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Delete this question?")) {
                          deleteQuestionMutation.mutate(q.id);
                        }
                      }}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Options List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {q.options.map((opt, optIndex) => (
                    <div
                      key={opt.id}
                      className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                        opt.is_correct
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      <span>
                        <span className="font-bold mr-2 text-foreground">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        {opt.option_text}
                      </span>
                      {opt.is_correct && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          <Check className="w-3 h-3" />
                          Correct
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <p className="text-xs text-muted-foreground bg-background/50 p-2.5 rounded-lg border border-border/50">
                    <span className="font-semibold text-foreground mr-1">Feedback:</span>
                    {q.explanation}
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Add / Edit Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">
                {editingQuestionId ? "Edit Question" : "Add New Question"}
              </h3>
              <button
                onClick={closeQuestionModal}
                className="text-muted-foreground hover:text-foreground text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* Question Type & Points */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Question Type
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      setQuestionType(newType);
                      if (newType === "true_false") {
                        setOptions([
                          { option_text: "True", is_correct: true, explanation: "" },
                          { option_text: "False", is_correct: false, explanation: "" },
                        ]);
                      }
                    }}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="multiple_select">Multiple Select</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Points
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={points}
                    onChange={(e) => setPoints(parseInt(e.target.value) || 1)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Question Prompt *
                </label>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Enter the question text..."
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Answer Options */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Answer Options (Mark the correct answer{questionType === "multiple_select" ? "s" : ""})
                  </label>
                  {questionType !== "true_false" && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      + Add Option
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {options.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2.5">
                      <input
                        type={questionType === "multiple_select" ? "checkbox" : "radio"}
                        name="correct_option"
                        checked={opt.is_correct}
                        onChange={() => handleOptionCorrectToggle(idx)}
                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                      />
                      <Input
                        value={opt.option_text}
                        onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + idx)} text`}
                        className="bg-background flex-1"
                      />
                      {questionType !== "true_false" && options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(idx)}
                          className="text-muted-foreground hover:text-destructive p-1.5"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback / Explanation */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Explanation & Feedback (Optional)
                </label>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Shown to students on results page explaining why the answer is correct..."
                  rows={2}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={closeQuestionModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saveQuestionMutation.isPending}
                >
                  {saveQuestionMutation.isPending ? "Saving..." : "Save Question"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

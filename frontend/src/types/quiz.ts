export type QuizStatus = "draft" | "published" | "archived";

export type QuestionType = "single_choice" | "true_false" | "multiple_select";

export type AttemptStatus = "in_progress" | "completed" | "expired";

export interface QuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
  is_correct: boolean;
  explanation?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentQuestionOption {
  id: string;
  option_text: string;
  order_index: number;
}

export interface QuestionOptionCreate {
  option_text: string;
  order_index?: number;
  is_correct: boolean;
  explanation?: string | null;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  points: number;
  explanation?: string | null;
  is_required: boolean;
  options: QuestionOption[];
  created_at: string;
  updated_at: string;
}

export interface StudentQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  points: number;
  is_required: boolean;
  options: StudentQuestionOption[];
}

export interface QuizQuestionCreate {
  question_text: string;
  question_type: QuestionType;
  order_index?: number;
  points: number;
  explanation?: string | null;
  is_required?: boolean;
  options: QuestionOptionCreate[];
}

export interface QuizQuestionUpdate {
  question_text?: string;
  question_type?: QuestionType;
  order_index?: number;
  points?: number;
  explanation?: string | null;
  is_required?: boolean;
  options?: QuestionOptionCreate[];
}

export interface Quiz {
  id: string;
  organization_id?: string | null;
  course_id: string;
  lesson_id?: string | null;
  instructor_id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  duration_minutes: number;
  passing_score_percentage: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  status: QuizStatus;
  published_at?: string | null;
  archived_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuizDetail extends Quiz {
  questions: QuizQuestion[];
  total_points: number;
  question_count: number;
}

export interface QuizCreate {
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  duration_minutes?: number;
  passing_score_percentage?: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
}

export interface QuizUpdate {
  title?: string;
  lesson_id?: string | null;
  description?: string | null;
  instructions?: string | null;
  duration_minutes?: number;
  passing_score_percentage?: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
}

export interface StudentCourseQuizItem {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  duration_minutes: number;
  passing_score_percentage: number;
  max_attempts: number;
  question_count: number;
  total_points: number;
  attempts_count: number;
  best_score_percentage?: number | null;
  is_passed: boolean;
  can_attempt: boolean;
  active_attempt_id?: string | null;
}

export interface StudentQuizTakeResponse {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  instructions?: string | null;
  duration_minutes: number;
  passing_score_percentage: number;
  max_attempts: number;
  total_points: number;
  question_count: number;
  active_attempt_id?: string | null;
  time_remaining_seconds?: number | null;
  questions: StudentQuizQuestion[];
}

export interface QuizAttemptStart {
  id: string;
  quiz_id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  duration_minutes: number;
  time_remaining_seconds?: number | null;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  order_index: number;
  points_possible: number;
  points_awarded: number;
  is_correct: boolean;
  selected_option_ids: string[];
  correct_option_ids: string[];
  options: QuestionOption[];
  explanation?: string | null;
}

export interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at?: string | null;
  time_spent_seconds?: number | null;
  score: number;
  max_score: number;
  percentage_score: number;
  passed: boolean;
  passing_score_percentage: number;
  can_retake: boolean;
  attempts_remaining?: number | null;
  question_results: QuestionResult[];
}

export interface StudentQuizAttemptSummary {
  id: string;
  attempt_number: number;
  status: AttemptStatus;
  started_at: string;
  submitted_at?: string | null;
  score: number;
  max_score: number;
  percentage_score: number;
  passed: boolean;
  time_spent_seconds?: number | null;
}

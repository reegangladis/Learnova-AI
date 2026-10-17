export interface RecommendedCourseItem {
  course_id: string;
  title: string;
  slug: string;
  short_description: string;
  category_name?: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | string;
  duration_minutes: number;
  score: number;
  strategy: "content_based" | "category_matching" | "popularity_fallback" | string;
  reason: string;
  matching_topics: string[];
}

export interface CourseRecommendationsResponse {
  recommendations: RecommendedCourseItem[];
  total_evaluated: number;
  applied_strategy: string;
  is_fallback: boolean;
}

export interface ContributingFactor {
  factor_name: string;
  impact: "positive" | "neutral" | "concerning";
  description: string;
  weight: number;
}

export interface LearningInsightsResponse {
  student_id: string;
  risk_level: "low" | "moderate" | "high" | "insufficient_data";
  risk_score: number;
  confidence_score: number;
  momentum_status: "accelerating" | "steady" | "needs_attention" | "insufficient_data";
  contributing_factors: ContributingFactor[];
  supportive_guidance: string[];
  model_version: string;
  is_insufficient_data: boolean;
}

export interface PrerequisiteCheck {
  prerequisite_name: string;
  is_met: boolean;
  evidence: string;
}

export interface SkillGapAlert {
  topic: string;
  assessment_title: string;
  score: number;
  recommendation: string;
}

export interface LearningPathStep {
  step_type: "lesson_completion" | "course_enrollment";
  title: string;
  description: string;
  course_id?: string | null;
  course_title?: string | null;
  lesson_id?: string | null;
  lesson_title?: string | null;
  estimated_minutes: number;
  confidence_level: "high" | "medium" | "exploratory";
}

export interface LearningPathResponse {
  student_id: string;
  current_focus: string;
  next_step: LearningPathStep;
  prerequisite_checks: PrerequisiteCheck[];
  skill_gaps: SkillGapAlert[];
  rationale: string;
}

export interface ModelEvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  roc_auc?: number | null;
  sample_size: number;
  confusion_matrix: number[][];
}

export interface ModelVersionInfo {
  model_name: string;
  version: string;
  framework: string;
  status: string;
  trained_at: string;
  metrics?: ModelEvaluationMetrics | null;
  features: string[];
}

export interface ModelStatusResponse {
  service_status: string;
  active_models: ModelVersionInfo[];
  registry_path: string;
  last_evaluated?: string | null;
}

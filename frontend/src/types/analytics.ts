// ============================================================================
// Shared Types
// ============================================================================

export interface RoleCountItem {
  role: string;
  count: number;
}

export interface DateMetricItem {
  date: string;
  count: number;
}

// ============================================================================
// Student Analytics Types
// ============================================================================

export interface StudentResumeCourse {
  course_id: string;
  course_title: string;
  thumbnail_url: string | null;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  next_lesson_id: string | null;
  next_lesson_title: string | null;
}

export interface StudentOverview {
  total_enrolled_courses: number;
  courses_in_progress: number;
  courses_completed: number;
  courses_dropped: number;
  overall_learning_progress: number;
  total_lessons_count: number;
  completed_lessons_count: number;
  remaining_lessons_count: number;
  total_quiz_attempts: number;
  passed_quiz_attempts: number;
  average_quiz_score: number;
  quiz_pass_rate: number;
  total_time_spent_minutes: number;
  resume_courses: StudentResumeCourse[];
}

export interface StudentRecentActivity {
  id: string;
  activity_type: "lesson_completion" | "quiz_attempt" | "course_enrollment" | string;
  title: string;
  subtitle: string;
  timestamp: string;
  status: string | null;
  score: number | null;
  course_id: string | null;
  course_title: string | null;
}

export interface StudentProgressTrend {
  [key: string]: unknown;
  date: string;
  lessons_completed: number;
  quizzes_completed: number;
}

export interface StudentActivityResponse {
  recent_activities: StudentRecentActivity[];
  progress_trends: StudentProgressTrend[];
}

export interface StudentAssessmentResult {
  attempt_id: string;
  quiz_id: string;
  quiz_title: string;
  course_id: string;
  course_title: string;
  attempt_number: number;
  score: number;
  max_score: number;
  percentage_score: number;
  passed: boolean;
  time_spent_seconds: number | null;
  submitted_at: string | null;
}

export interface StudentAssessmentsResponse {
  total_attempts: number;
  passed_attempts: number;
  average_score: number;
  pass_rate: number;
  results: StudentAssessmentResult[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Instructor Analytics Types
// ============================================================================

export interface InstructorTrend {
  [key: string]: unknown;
  date: string;
  enrollments: number;
  completions: number;
  quiz_attempts: number;
}

export interface InstructorOverview {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  archived_courses: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  dropped_enrollments: number;
  unique_students: number;
  course_completion_rate: number;
  total_lessons: number;
  total_lesson_completions: number;
  student_lesson_progress_rate: number;
  total_quizzes: number;
  total_quiz_attempts: number;
  average_quiz_score: number;
  quiz_pass_rate: number;
  trends: InstructorTrend[];
}

export interface InstructorCourseComparison {
  course_id: string;
  title: string;
  status: string;
  difficulty: string;
  total_lessons: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  dropped_enrollments: number;
  completion_rate: number;
  total_quiz_attempts: number;
  average_quiz_score: number;
  quiz_pass_rate: number;
  created_at: string;
  published_at: string | null;
}

export interface InstructorCoursesResponse {
  courses: InstructorCourseComparison[];
  total: number;
  page: number;
  page_size: number;
}

export interface InstructorScoreDistribution {
  range_0_50: number;
  range_51_70: number;
  range_71_85: number;
  range_86_100: number;
}

export interface InstructorAssessment {
  quiz_id: string;
  title: string;
  course_id: string;
  course_title: string;
  passing_score_percentage: number;
  status: string;
  total_attempts: number;
  unique_participants: number;
  passed_attempts: number;
  pass_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  average_time_spent_seconds: number | null;
  score_distribution: InstructorScoreDistribution;
}

export interface InstructorAssessmentsResponse {
  assessments: InstructorAssessment[];
  total: number;
  page: number;
  page_size: number;
}

// ============================================================================
// Administrator Analytics Types
// ============================================================================

export interface AdminRecentActivity {
  id: string;
  event_type: string;
  description: string;
  user_id: string | null;
  user_email: string | null;
  timestamp: string;
  metadata_json: Record<string, unknown>;
}

export interface AdminTrend {
  [key: string]: unknown;
  date: string;
  new_users: number;
  new_enrollments: number;
  completions: number;
}

export interface AdminOverview {
  organization_id: string | null;
  organization_name: string | null;
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: RoleCountItem[];
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  archived_courses: number;
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  dropped_enrollments: number;
  overall_completion_rate: number;
  total_quiz_attempts: number;
  average_quiz_score: number;
  quiz_pass_rate: number;
  recent_activity: AdminRecentActivity[];
  trends: AdminTrend[];
}

export interface AdminUserAnalytics {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  is_active: boolean;
  is_verified: boolean;
  enrolled_courses_count: number;
  completed_courses_count: number;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUsersResponse {
  total_users: number;
  active_users: number;
  inactive_users: number;
  users_by_role: RoleCountItem[];
  users: AdminUserAnalytics[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminCourseAnalytics {
  course_id: string;
  title: string;
  instructor_name: string;
  instructor_email: string;
  category_name: string | null;
  status: string;
  difficulty: string;
  total_enrollments: number;
  completed_enrollments: number;
  completion_rate: number;
  total_lessons: number;
  average_quiz_score: number;
  created_at: string;
}

export interface AdminCoursesResponse {
  total_courses: number;
  published_courses: number;
  draft_courses: number;
  archived_courses: number;
  courses: AdminCourseAnalytics[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminEnrollment {
  enrollment_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  course_id: string;
  course_title: string;
  status: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
}

export interface AdminEnrollmentsResponse {
  total_enrollments: number;
  active_enrollments: number;
  completed_enrollments: number;
  dropped_enrollments: number;
  completion_rate: number;
  enrollments: AdminEnrollment[];
  trends: AdminTrend[];
  total: number;
  page: number;
  page_size: number;
}

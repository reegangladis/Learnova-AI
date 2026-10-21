import { Course } from "./course";

export type EnrollmentStatus = "active" | "completed" | "dropped";

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  status: EnrollmentStatus;
  enrolled_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;

  course?: Course | null;
  progress_percentage: number;
  completed_lessons_count: number;
  total_lessons_count: number;
  next_lesson_id: string | null;
}

export interface EnrollmentListResponse {
  items: Enrollment[];
  total: number;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  is_completed: boolean;
  completed_at: string | null;
  playback_position_seconds?: number;
  playback_duration_seconds?: number;
  last_accessed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseProgress {
  course_id: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  completed_lesson_ids: string[];
  is_course_completed: boolean;
}

export interface LearningLesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  content_type: "text" | "video" | "pdf" | "external_resource";
  text_content: string | null;
  resource_url: string | null;
  duration_minutes: number;
  order_index: number;
  is_preview: boolean;
  is_completed: boolean;
  completed_at: string | null;
  playback_position_seconds?: number;
  playback_duration_seconds?: number;
}

export interface LearningModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: LearningLesson[];
  completed_lessons_count: number;
  total_lessons_count: number;
}

export interface LearningCourse {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail_url: string | null;
  difficulty: string;
  duration_minutes: number;
  learning_objectives: string[];
  prerequisites: string[];
  modules: LearningModule[];
  progress: CourseProgress;
  enrollment_status: string;
  enrolled_at: string;
  completed_at: string | null;
}

export interface ResumeLearning {
  course_id: string;
  next_lesson_id: string | null;
  next_lesson_title: string | null;
  next_module_id: string | null;
  is_completed: boolean;
  progress_percentage: number;
  completed_lessons: number;
  total_lessons: number;
  playback_position_seconds?: number;
}

export interface LessonProgressBatchItem {
  lesson_id: string;
  is_completed?: boolean | null;
  playback_position_seconds?: number | null;
  playback_duration_seconds?: number | null;
  client_timestamp?: string | null;
}

export interface BatchProgressSyncRequest {
  course_id: string;
  updates: LessonProgressBatchItem[];
}

export interface BatchProgressSyncResponse {
  course_id: string;
  synced_count: number;
  progress: CourseProgress;
}

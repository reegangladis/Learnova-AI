export type CourseDifficulty = "beginner" | "intermediate" | "advanced";

export type CourseStatus = "draft" | "published" | "archived";

export type LessonContentType = "text" | "video" | "pdf" | "external_resource";

export interface CourseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description?: string | null;
  content_type: LessonContentType;
  text_content?: string | null;
  resource_url?: string | null;
  duration_minutes: number;
  order_index: number;
  is_preview: boolean;
  text_extraction_status: string;
  content_processing_status: string;
  last_processed_at?: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description?: string | null;
  order_index: number;
  lessons: Lesson[];
  created_at: string;
  updated_at: string;
}

export interface InstructorSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  avatar_url?: string | null;
}

export interface Course {
  id: string;
  organization_id?: string | null;
  instructor_id: string;
  instructor?: InstructorSummary | null;
  category_id?: string | null;
  category?: CourseCategory | null;
  title: string;
  slug: string;
  short_description: string;
  description: string;
  thumbnail_url?: string | null;
  difficulty: CourseDifficulty;
  duration_minutes: number;
  learning_objectives: string[];
  prerequisites: string[];
  status: CourseStatus;
  language: string;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  modules_count: number;
  lessons_count: number;
}

export interface CourseDetail extends Course {
  modules: CourseModule[];
}

export interface CourseListResponse {
  items: Course[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CourseCreatePayload {
  title: string;
  slug?: string;
  short_description: string;
  description: string;
  category_id?: string;
  thumbnail_url?: string;
  difficulty?: CourseDifficulty;
  duration_minutes?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  language?: string;
}

export interface CourseUpdatePayload {
  title?: string;
  slug?: string;
  short_description?: string;
  description?: string;
  category_id?: string;
  thumbnail_url?: string;
  difficulty?: CourseDifficulty;
  duration_minutes?: number;
  learning_objectives?: string[];
  prerequisites?: string[];
  language?: string;
}

export interface ModuleCreatePayload {
  title: string;
  description?: string;
  order_index?: number;
}

export interface ModuleUpdatePayload {
  title?: string;
  description?: string;
  order_index?: number;
}

export interface LessonCreatePayload {
  title: string;
  description?: string;
  content_type: LessonContentType;
  text_content?: string;
  resource_url?: string;
  duration_minutes?: number;
  order_index?: number;
  is_preview?: boolean;
  metadata_json?: Record<string, unknown>;
}

export interface LessonUpdatePayload {
  title?: string;
  description?: string;
  content_type?: LessonContentType;
  text_content?: string;
  resource_url?: string;
  duration_minutes?: number;
  order_index?: number;
  is_preview?: boolean;
  metadata_json?: Record<string, unknown>;
}

export interface CourseCategoryCreatePayload {
  name: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface CourseCategoryUpdatePayload {
  name?: string;
  slug?: string;
  description?: string;
  is_active?: boolean;
}

export interface CourseFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  category_id?: string;
  difficulty?: string;
  status?: string;
  instructor_id?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface SourceCitation {
  chunk_id?: string;
  course_id?: string;
  module_id?: string | null;
  lesson_id?: string | null;
  lesson_title?: string | null;
  document_title?: string | null;
  page_number?: number | null;
  similarity_score?: number | null;
  snippet?: string;
}

export interface AIChatRequest {
  message: string;
  course_id?: string | null;
  lesson_id?: string | null;
  conversation_id?: string | null;
  top_k?: number;
  relevance_threshold?: number;
}

export interface DocumentIngestionResponse {
  course_id: string;
  lesson_id?: string | null;
  document_title: string;
  file_name: string;
  status: string;
  total_pages: number;
  chunks_count: number;
  content_hash: string;
  job_id: string;
}

export interface AIChatResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  role: string;
  grounded_in_sources: boolean;
  citations: SourceCitation[];
  follow_up_suggestions: string[];
  tokens_used?: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  grounded_in_sources?: boolean;
  citations?: SourceCitation[];
  follow_up_suggestions?: string[];
  created_at: string;
}

export interface AIConversation {
  id: string;
  title: string;
  course_id?: string | null;
  lesson_id?: string | null;
  created_at: string;
  updated_at: string;
  messages?: AIMessage[];
}

export interface CourseIngestionStatus {
  course_id: string;
  total_chunks: number;
  last_ingested_at: string | null;
  active_jobs: number;
  recent_status: "pending" | "processing" | "completed" | "failed" | "not_ingested";
}

export interface IngestionJobResponse {
  job_id: string;
  course_id: string;
  lesson_id?: string | null;
  status: string;
  message: string;
}

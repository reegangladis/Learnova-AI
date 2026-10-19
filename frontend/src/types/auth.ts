import { APIErrorDetails } from "./api";

export type SystemRole = "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR" | "STUDENT";

export type SystemPermission =
  | "USER_READ"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "COURSE_READ"
  | "COURSE_CREATE"
  | "COURSE_UPDATE"
  | "COURSE_DELETE"
  | "COURSE_PUBLISH"
  | "STUDENT_READ"
  | "STUDENT_MANAGE"
  | "ANALYTICS_READ"
  | "SYSTEM_MANAGE"
  | "AI_USE"
  | "ML_READ";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  roles: string[];
  permissions: string[];
  organization_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  message?: string;
  access_token?: string;
  token_type?: string;
  error?: APIErrorDetails;
}

export interface SessionInfo {
  id: string;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string;
  last_active_at: string;
}

export type SessionListResponse =
  | SessionInfo[]
  | {
      success: boolean;
      sessions: SessionInfo[];
      total?: number;
    };

export interface LoginHistoryItem {
  id: string;
  user_id: string | null;
  email_attempted: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  failure_reason: string | null;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PaginatedUsersResponse {
  items: User[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

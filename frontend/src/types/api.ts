export interface APIErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: APIErrorDetails;
}

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

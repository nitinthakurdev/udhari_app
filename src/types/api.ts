export interface ApiSuccess<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  meta: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
  has_previous_page: boolean;
}

export interface PaginatedApiSuccess<T> extends ApiSuccess<T[]> {
  meta: ApiSuccess<T[]>["meta"] & { pagination: PaginationMeta };
}

export interface ApiValidationDetail {
  location?: string;
  field?: string;
  message?: string;
}

export interface ApiErrorBody {
  error?: {
    message?: string;
    details?: ApiValidationDetail[];
  };
  message?: string;
}

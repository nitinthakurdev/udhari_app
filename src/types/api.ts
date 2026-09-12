export interface ApiSuccess<T> {
  success: true;
  statusCode: number;
  message?: string;
  data: T;
  meta: Record<string, unknown>;
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

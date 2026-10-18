export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export interface ApiErrorDetail {
  path: string;
  message: string;
}

/** Body of every non-2xx API response. */
export interface ApiError {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: ApiErrorDetail[];
  };
}

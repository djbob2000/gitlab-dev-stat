/**
 * Base API error codes used across the application
 */
export type ApiErrorCode =
  | 'AUTHENTICATION_ERROR'
  | 'INTERNAL_SERVER_ERROR'
  | 'GITLAB_API_ERROR'
  | 'INVALID_TOKEN'
  | 'PROJECT_NOT_FOUND';

/**
 * Base API error structure that all error responses should extend
 */
export interface BaseApiError {
  message: string;
  code: ApiErrorCode;
  details?: unknown;
  timestamp: string;
}

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  success: false;
  error: BaseApiError;
}

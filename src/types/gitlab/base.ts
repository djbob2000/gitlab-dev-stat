import { z } from 'zod';

/**
 * Unique identifier for GitLab entities
 *
 * Using a simple number type for compatibility with existing code
 */
export type GitLabId = number;

/**
 * Common timestamp fields present in most GitLab entities
 */
export interface GitLabTimestamps {
  readonly created_at: string;
  readonly updated_at: string;
}

/**
 * GitLab user states
 */
export type GitLabUserState = 'active' | 'blocked' | 'deactivated';

/**
 * Represents a GitLab user entity
 */
export interface GitLabUser {
  readonly id: GitLabId;
  readonly name: string;
  readonly username: string;
  readonly state: GitLabUserState;
  readonly avatar_url: string | null;
  readonly web_url: string;
}

/**
 * Successful API response wrapper
 */
export interface ApiResponse<T> {
  readonly data: T;
  readonly success: true;
  readonly message?: string;
}

/**
 * Error API response wrapper
 */
export interface ApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly message: string;
    readonly code?: string;
    readonly details?: Record<string, unknown>;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse;

/**
 * Type guard to check if response is an error
 */
export const isApiError = (response: ApiResult<unknown>): response is ApiErrorResponse => {
  return !response.success;
};

/**
 * Schema for date range parameters
 */
export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type DateRangeParams = z.infer<typeof dateRangeSchema>;

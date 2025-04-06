import { z } from 'zod';
import { BaseApiError } from '../common/api.types';

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
 * GitLab-specific error structure
 */
export interface GitLabError extends BaseApiError {
  gitlabResponse?: unknown;
}

/**
 * GitLab API error response
 */
export interface GitLabErrorResponse {
  success: false;
  error: GitLabError;
}

/**
 * Successful API response wrapper
 */
export interface ApiResponse<T> {
  readonly data: T;
  readonly success: true;
  readonly message?: string;
}

export type ApiResult<T> = ApiResponse<T> | GitLabErrorResponse;

/**
 * Type guard to check if response is an error
 */
export const isApiError = (response: ApiResult<unknown>): response is GitLabErrorResponse => {
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

/**
 * Represents a time interval with a start and optional end time
 */
export interface TimeInterval {
  start: Date;
  end: Date | null;
}

/**
 * Statistics about time spent on an issue calculated from events
 */
export interface IssueTimeTrackingStats {
  issueId: number;
  totalDuration: number; // in milliseconds
  intervals: TimeInterval[];
}

/**
 * Type for batch processing function
 * @template T Input item type
 * @template R Result type
 */
export type BatchProcessor<T, R> = (item: T) => Promise<R>;

/**
 * Interface for merge request statistics
 */
export interface MergeRequestWithStats {
  mrIid: number;
  labels: string[];
  url: string;
  title: string;
  actionRequiredLabelTime?: number;
  statusUpdateCommitCount?: number;
}

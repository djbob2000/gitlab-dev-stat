import { GitLabId, GitLabTimestamps, GitLabUser } from './base';

export type MergeRequestState = 'opened' | 'closed' | 'merged';

/**
 * GitLab merge request entity as returned by the API
 */
export interface MergeRequest extends GitLabTimestamps {
  readonly id: GitLabId;
  readonly iid: number;
  readonly project_id: GitLabId;
  readonly title: string;
  readonly description: string | null;
  readonly state: MergeRequestState;
  readonly merged_at: string | null;
  readonly closed_at: string | null;
  readonly target_branch: string;
  readonly source_branch: string;
  readonly author: GitLabUser;
  readonly assignee: GitLabUser | null;
  readonly labels: string[];
  readonly web_url: string;
}

/**
 * Interface for merge request info in issue statistics
 * Used in issue.mergeRequests array
 */
export interface MergeRequestInfo {
  mrIid: number;
  url: string;
  title: string;
  labels: string[];
  actionRequiredLabelTime?: number;
  statusUpdateCommitCount?: number;
}

/**
 * Labels and their timestamps for merge request tracking
 */
export interface MergeRequestLabels {
  actionRequired: boolean;
  statusUpdateNeeded: boolean;
  lastActionRequiredDate: string | null;
  lastStatusUpdateDate: string | null;
  mrIid: number;
  url: string;
  title: string;
  labels: string[];
  statusUpdateCommitCount?: number;
}

/**
 * Aggregated statistics for merge requests
 */
export interface MergeRequestStatistics {
  totalMergeRequests: number;
  openMergeRequests: number;
  mergedMergeRequests: number;
  closedMergeRequests: number;
  averageTimeToMerge: number;
  labels: MergeRequestLabels;
}

/**
 * Type guard to check if a merge request is merged
 */
export const isMerged = (mr: MergeRequest): boolean => {
  return mr.state === 'merged';
};

import { GitLabId, GitLabTimestamps } from './base';
import { IndividualIssueStats, IssueStatistics } from './issues';

/**
 * Project visibility levels in GitLab
 */
export type ProjectVisibility = 'private' | 'internal' | 'public';

/**
 * GitLab project entity as returned by the API
 */
export interface GitLabProject extends GitLabTimestamps {
  readonly id: GitLabId;
  readonly name: string;
  readonly name_with_namespace: string;
  readonly path: string;
  readonly path_with_namespace: string;
  readonly description: string | null;
  readonly web_url: string;
  readonly avatar_url: string | null;
  readonly star_count: number;
  readonly forks_count: number;
  readonly last_activity_at: string;
  readonly visibility: ProjectVisibility;
}

/**
 * Project statistics aggregated from issues and merge requests
 */
export interface ProjectStatistics {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  averageTimeToClose: number;
  actionRequiredLabelTime?: number;
  statusUpdateCommitCount?: number;
  issues: IndividualIssueStats[];
  lastUpdated?: string;
}

/**
 * Developer information associated with a project
 */
export interface ProjectDeveloper {
  userId: number;
  username: string;
}

/**
 * Project data with loading state and error handling
 */
export interface ProjectData {
  id: GitLabId;
  name: string;
  path: string;
  developers: ProjectDeveloper[];
  data: IssueStatistics[]; // Use IssueStatistics array
  statistics: ProjectStatistics;
  isLoading: boolean;
  error?: string | null;
  lastUpdated?: Date;
}

/**
 * Type guard to check if a project has statistics
 */
export const hasProjectStatistics = (project: ProjectData): boolean => {
  return !project.isLoading && !project.error && !!project.statistics;
};

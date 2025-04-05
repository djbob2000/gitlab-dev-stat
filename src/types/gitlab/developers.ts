import { GitLabId, GitLabUser } from './base';
import { IndividualIssueStats } from './issues';
import { MergeRequestStatistics } from './merge-requests';

/**
 * Extended GitLab user with tracking status and project associations
 */
export interface TrackedDeveloper extends GitLabUser {
  tracked: boolean;
  projectIds: GitLabId[];
}

/**
 * Statistics about a developer's issue activity
 */
export interface DeveloperIssueStats {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  averageTimeToClose: number;
  actionRequiredLabelTime?: number;
  statusUpdateCommitCount?: number;
  issues: IndividualIssueStats[];
  assignedIssues: number;
  resolvedIssues: number;
  responseTime: number;
  resolutionTime: number;
}

/**
 * Project-specific contribution metrics
 */
export interface ProjectContribution {
  projectId: GitLabId;
  issueCount: number;
  mergeRequestCount: number;
}

/**
 * Comprehensive statistics for a developer
 */
export interface DeveloperStatistics {
  developer: TrackedDeveloper;
  issues: DeveloperIssueStats;
  mergeRequests: MergeRequestStatistics;
  contributionScore: number;
  lastActive: string;
  projectContributions: ProjectContribution[];
}

/**
 * Request payload for creating a tracked developer
 */
export interface CreateDeveloperRequest {
  userId: GitLabId;
  projectIds: GitLabId[];
}

/**
 * Type guard to check if a developer is tracked
 */
export const isTrackedDeveloper = (user: GitLabUser): user is TrackedDeveloper => {
  return 'tracked' in user && 'projectIds' in user;
};

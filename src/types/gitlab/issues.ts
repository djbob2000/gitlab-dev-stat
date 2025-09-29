import { GitLabId, GitLabTimestamps, GitLabUser } from './base';
import { MergeRequestInfo } from './merge-requests';

/**
 * GitLab milestone entity
 */
export interface GitlabMilestone {
  readonly id: number;
  readonly iid: number;
  readonly project_id: number;
  readonly title: string;
  readonly description: string;
  readonly due_date: string | null;
  readonly start_date: string | null;
  readonly state: string;
  readonly updated_at: string;
  readonly created_at: string;
  readonly expired: boolean;
}

export type IssueState = 'opened' | 'closed';

/**
 * GitLab label entity
 */
export interface GitLabLabel {
  readonly id: GitLabId;
  readonly name: string;
  readonly color: string;
  readonly description: string | null;
}

/**
 * GitLab issue entity as returned by the API
 */
export interface GitLabIssue extends GitLabTimestamps {
  readonly id: GitLabId;
  readonly iid: number;
  readonly project_id: GitLabId;
  readonly title: string;
  readonly description: string | null;
  readonly state: IssueState;
  readonly labels: string[];
  readonly author: GitLabUser;
  readonly assignee: GitLabUser | null;
  readonly web_url: string;
  readonly milestone?: GitlabMilestone | null;
}

/**
 * Issue statistics used in the UI
 */
export interface IssueStatistics {
  id: number;
  iid: number;
  title: string;
  timeInProgress: number;
  totalTimeFromStart: number;
  actionRequiredTime?: number;
  assignee: GitLabUser | null;
  labels: string[];
  mergeRequests: MergeRequestInfo[];
  url: string;
  milestone?: GitlabMilestone | null;
}

export type IssueEventType = 'label_added' | 'label_removed' | 'closed' | 'reopened';

/**
 * Issue event entity
 */
export interface IssueEvent extends GitLabTimestamps {
  id: GitLabId;
  user: GitLabUser;
  action_type: IssueEventType;
  label?: {
    id: GitLabId;
    name: string;
    color: string;
  };
}

/**
 * GitLab note (comment) entity
 */
export interface GitLabNote extends GitLabTimestamps {
  id: GitLabId;
  body: string;
  author: GitLabUser;
  system: boolean;
}

/**
 * Extended issue entity with events and notes
 */
export interface IssueWithEvents extends GitLabIssue {
  events: IssueEvent[];
  notes: GitLabNote[];
}

/**
 * Time tracking statistics for an issue
 */
export interface IssueTimeStats {
  timeEstimate: number;
  totalTimeSpent: number;
  timeSpentInPeriod: number;
}

/**
 * Individual issue statistics
 */
export interface IndividualIssueStats {
  id: GitLabId;
  iid: number;
  title: string;
  assignee: GitLabUser | null;
  labels: string[];
  timeInProgress: number;
  totalTimeFromStart: number;
  mergeRequests: {
    mrIid: number;
    labels: string[];
    url: string;
    title: string;
    actionRequiredLabelTime?: number;
    statusUpdateCommitCount?: number;
  }[];
  actionRequiredTime?: number;
  url: string;
}

/**
 * Type guard to check if an issue is closed
 */
export const isClosed = (issue: GitLabIssue): boolean => {
  return issue.state === 'closed';
};

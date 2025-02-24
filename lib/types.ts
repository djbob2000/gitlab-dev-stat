// GitLab Types
export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  labels: string[];
  author: {
    id: number;
    username: string;
  };
  assignee?: {
    id: number;
    username: string;
  } | null;
}

export interface GitLabEvent {
  id: number;
  user: {
    id: number;
    username: string;
  };
  created_at: string;
  resource_type: string;
  action: string;
  label?: {
    id: number;
    name: string;
  };
}

export interface MergeRequestLabels {
  mrIid: number;
  labels: string[];
  url: string;
  title: string;
}

export interface IssueStatistics {
  id: number;
  iid: number;
  title: string;
  timeInProgress: number;
  totalTimeFromStart: number;
  url: string;
  labels: string[];
  username: string;
  mergeRequestLabels?: MergeRequestLabels[];
}

export interface IssueWithEvents extends GitLabIssue {
  events: GitLabEvent[];
  inProgressDuration: number; // Duration in milliseconds
}

// Developer Statistics Types
export interface DeveloperIssueStats {
  id: number;
  iid: number;
  title: string;
  timeInProgress: number;
  formattedTimeInProgress: string;
  url: string;
}

export interface DeveloperStatistics {
  username: string;
  issuesCount: number;
  issues: {
    id: number;
    iid: number;
    title: string;
    timeInProgress: number;
    totalTimeFromStart: number;
    formattedTimeInProgress: string;
    url: string;
    labels: string[];
  }[];
}

// API Types
export interface APIError {
  error: string;
  details?: unknown;
  status: number;
}

// Request Types
export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface StatisticsQueryParams extends DateRangeParams {
  usernames: string; // Comma-separated usernames
  projectId?: string;
}

export interface CreateDeveloperRequest {
  username: string;
}

// Response Types
export interface APIResponse<T> {
  data: T;
  error?: string;
  status: number;
}

export interface StatisticsResponse {
  developers: DeveloperStatistics[];
  totalIssues: number;
  averageTimePerIssue: number;
  formattedAverageTime: string;
}

// Database Types
export interface TrackedDeveloper {
  id: number;
  username: string;
  createdAt: Date;
}

export interface IssueStatistics {
  id: number;
  iid: number;
  title: string;
  timeInProgress: number;
  totalTimeFromStart: number;
  url: string;
  labels: string[];
  username: string;
} 
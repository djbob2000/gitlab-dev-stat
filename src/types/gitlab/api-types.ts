/**
 * GitLab API types
 * Contains types that match the actual API responses
 */

/**
 * GitLab API event entity as returned by the API
 */
export interface GitLabApiEvent {
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
  assignee?: {
    id: number;
    username: string;
  };
}

/**
 * GitLab API merge request entity as returned by the API
 */
export interface GitLabApiMergeRequest {
  id: number;
  iid: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  web_url: string;
  source_project_id: number;
  author: {
    id: number;
    username: string;
  };
}

import { Gitlab } from '@gitbeaker/rest';

// Types for our module
export interface GitLabConfig {
  baseUrl: string;
  token: string;
}

export interface IssueEvent {
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

export interface Issue {
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

export interface IssueWithEvents extends Partial<Issue> {
  id: number;
  iid: number;
  events: IssueEvent[];
  inProgressDuration: number; // Duration in milliseconds
}

// GitLab API client
export const createGitLabClient = ({ baseUrl, token }: GitLabConfig) => {
  const api = new Gitlab({
    host: baseUrl,
    token,
  });

  const getIssueEvents = async (projectId: number, issueIid: number): Promise<IssueEvent[]> => {
    let page = 1;
    const perPage = 100;
    let allEvents: IssueEvent[] = [];
    
    while (true) {
      const events = await api.IssueLabelEvents.all(projectId, issueIid, {
        perPage,
        page,
      });
      
      if (events.length === 0) break;
      
      allEvents = [...allEvents, ...events as IssueEvent[]];
      if (events.length < perPage) break;
      
      page++;
    }

    return allEvents;
  };

  const calculateInProgressDuration = (events: IssueEvent[]): number => {
    let duration = 0;
    let lastInProgressStart: string | null = null;

    // Sort events by creation date
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const event of sortedEvents) {
      if (event.label?.name === 'in-progress') {
        if (event.action === 'add' && !lastInProgressStart) {
          lastInProgressStart = event.created_at;
        } else if (event.action === 'remove' && lastInProgressStart) {
          duration += new Date(event.created_at).getTime() - new Date(lastInProgressStart).getTime();
          lastInProgressStart = null;
        }
      }
    }

    // If the issue is still in progress, count duration until now
    if (lastInProgressStart) {
      duration += new Date().getTime() - new Date(lastInProgressStart).getTime();
    }

    return duration;
  };

  const getIssueWithEvents = async (
    projectId: number,
    issueIid: number
  ): Promise<IssueWithEvents> => {
    const [issue, events] = await Promise.all([
      api.Issues.show(Number(projectId)),
      getIssueEvents(projectId, issueIid),
    ]);

    return {
      ...issue,
      events,
      inProgressDuration: calculateInProgressDuration(events),
    } as IssueWithEvents;
  };

  const getProjectIssues = async (
    projectId: number,
    assigneeUsernames?: string[]
  ): Promise<IssueWithEvents[]> => {
    let page = 1;
    const perPage = 100;
    let allIssues: Partial<Issue>[] = [];

    while (true) {
      const issues = await api.Issues.all({
        projectId: Number(projectId),
        perPage,
        page,
        assigneeUsername: assigneeUsernames,
      });

      if (issues.length === 0) break;

      allIssues = [...allIssues, ...issues];
      if (issues.length < perPage) break;

      page++;
    }

    // Get events for each issue
    const issuesWithEvents = await Promise.all(
      allIssues.filter((issue): issue is Issue => typeof issue.iid === 'number')
        .map(issue => getIssueWithEvents(projectId, issue.iid))
    );

    return issuesWithEvents;
  };

  async function getProjectMembers(projectId: number) {
    const members = await api.ProjectMembers.all(projectId);
    return members.map(member => ({
      id: member.id,
      username: member.username,
    }));
  }

  return {
    getIssueWithEvents,
    getProjectIssues,
    getProjectMembers,
  };
}; 
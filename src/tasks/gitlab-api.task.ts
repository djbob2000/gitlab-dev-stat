// Types for our module
export interface GitLabConfig {
  baseUrl: string;
  token: string;
  projectPath: string;  // e.g. "fernir2/saas-kit"
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
  totalTimeFromStart: number; // Duration from first in-progress or creation to now
}

// GitLab API client
export const createGitLabClient = ({ baseUrl, token, projectPath }: GitLabConfig) => {
  const fetchFromGitLab = async (endpoint: string, params: Record<string, string | number> = {}) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    }
    
    const url = `${baseUrl}/api/v4${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    console.log('Fetching from GitLab:', url);
    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': token,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  };

  const getIssueEvents = async (projectId: number, issueIid: number): Promise<IssueEvent[]> => {
    console.log(`Fetching events for issue #${issueIid}`);
    let page = 1;
    const perPage = 100;
    let allEvents: IssueEvent[] = [];
    
    while (true) {
      const events = await fetchFromGitLab(
        `/projects/${projectId}/issues/${issueIid}/resource_label_events`,
        { per_page: perPage, page }
      );
      
      if (events.length === 0) break;
      
      allEvents = [...allEvents, ...events];
      if (events.length < perPage) break;
      
      page++;
    }

    console.log(`Found ${allEvents.length} events for issue #${issueIid}`);
    return allEvents;
  };

  const calculateInProgressDuration = (events: IssueEvent[], issueCreatedAt: string): { activeTime: number, totalTime: number } => {
    let activeTime = 0;
    let lastInProgressStart: string | null = null;
    let firstInProgressStart: string | null = null;

    // Sort events by creation date
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    for (const event of sortedEvents) {
      if (event.label?.name === 'in-progress') {
        if (event.action === 'add') {
          if (!firstInProgressStart) {
            firstInProgressStart = event.created_at;
            console.log(`First in-progress start at ${event.created_at}`);
          }
          if (!lastInProgressStart) {
            lastInProgressStart = event.created_at;
            console.log(`Found in-progress start at ${event.created_at}`);
          }
        } else if (event.action === 'remove' && lastInProgressStart) {
          activeTime += new Date(event.created_at).getTime() - new Date(lastInProgressStart).getTime();
          console.log(`Found in-progress end at ${event.created_at}, active time: ${activeTime}ms`);
          lastInProgressStart = null;
        }
      }
    }

    // If the issue is still in progress, count duration until now
    const now = new Date();
    if (lastInProgressStart) {
      activeTime += now.getTime() - new Date(lastInProgressStart).getTime();
      console.log(`Issue still in progress since ${lastInProgressStart}, adding duration until now (${now.toISOString()})`);
    }

    // Calculate total time from first in-progress to now, or from creation if no in-progress
    const startTime = firstInProgressStart || issueCreatedAt;
    const totalTime = now.getTime() - new Date(startTime).getTime();
    console.log(`Total time from ${firstInProgressStart ? 'first in-progress' : 'creation'}: ${totalTime}ms`);

    return { activeTime, totalTime };
  };

  const getIssueWithEvents = async (
    projectId: number,
    issueIid: number
  ): Promise<IssueWithEvents> => {
    console.log(`Fetching issue #${issueIid} details for project ${projectId}`);
    try {
      const [issue, events] = await Promise.all([
        fetchFromGitLab(`/projects/${projectId}/issues/${issueIid}`),
        getIssueEvents(projectId, issueIid),
      ]);

      const { activeTime, totalTime } = calculateInProgressDuration(events, issue.created_at);
      console.log(`Total in-progress duration for issue #${issueIid}: active=${activeTime}ms, total=${totalTime}ms`);

      return {
        ...issue,
        events,
        inProgressDuration: activeTime,
        totalTimeFromStart: totalTime,
      };
    } catch (error) {
      console.error(`Error fetching issue #${issueIid}:`, error);
      throw error;
    }
  };

  const getProjectIssues = async (
    projectId: number,
    assigneeUsernames?: string[]
  ): Promise<IssueWithEvents[]> => {
    if (!assigneeUsernames || assigneeUsernames.length === 0) {
      console.log('No assignees specified, returning empty list');
      return [];
    }

    console.log(`Fetching issues for project #${projectId}, assignees:`, assigneeUsernames);
    let allIssues: Issue[] = [];

    // Fetch issues for each assignee
    for (const username of assigneeUsernames) {
      let page = 1;
      const perPage = 100;
      
      while (true) {
        console.log(`Fetching issues for ${username}, page ${page}`);
        const issues = await fetchFromGitLab(`/projects/${projectId}/issues`, {
          assignee_username: username,
          state: 'opened',
          per_page: perPage,
          page
        });

        if (issues.length === 0) break;

        allIssues = [...allIssues, ...issues];
        if (issues.length < perPage) break;

        page++;
      }
    }

    console.log(`Found ${allIssues.length} total open issues for selected assignees`);

    // Get events for each issue
    const issuesWithEvents = await Promise.all(
      allIssues
        .filter((issue): issue is Issue => typeof issue.iid === 'number')
        .map(issue => getIssueWithEvents(projectId, issue.iid))
    );

    return issuesWithEvents;
  };

  async function getProjectMembers(projectId: number) {
    interface GitLabMember {
      id: number;
      username: string;
    }

    let page = 1;
    const perPage = 100;
    let allMembers: GitLabMember[] = [];
    
    while (true) {
      console.log(`Fetching project members, page ${page}`);
      const members = await fetchFromGitLab(`/projects/${projectId}/members/all`, {
        per_page: perPage,
        page
      }) as GitLabMember[];

      if (members.length === 0) break;

      allMembers = [...allMembers, ...members];
      if (members.length < perPage) break;

      page++;
    }

    console.log(`Found ${allMembers.length} total project members`);
    
    return allMembers.map(member => ({
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
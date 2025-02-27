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
  assignee?: {
    id: number;
    username: string;
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

export interface GitLabNote {
  id: number;
  body: string;
  author: {
    id: number;
    username: string;
  };
  created_at: string;
  system: boolean;
}

export interface MergeRequest {
  id: number;
  iid: number;
  title: string;
  state: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  web_url: string;
  author: {
    id: number;
    username: string;
  };
}

// GitLab API client
export const createGitLabClient = ({ baseUrl, token /* projectPath is unused */ }: GitLabConfig) => {
  const fetchFromGitLab = async (endpoint: string, params: Record<string, string | number> = {}) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    }
    
    const url = `${baseUrl}/api/v4${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
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
    let page = 1;
    const perPage = 100;
    let allEvents: IssueEvent[] = [];
    
    // Fetch label events
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

    // Fetch resource events (including assignments)
    page = 1;
    while (true) {
      const events = await fetchFromGitLab(
        `/projects/${projectId}/issues/${issueIid}/resource_state_events`,
        { per_page: perPage, page }
      );
      
      if (events.length === 0) break;
      
      allEvents = [...allEvents, ...events.map((event: { id: number; user: { id: number; username: string; }; created_at: string; action: string; assignee?: { id: number; username: string; }; }) => ({
        ...event,
        resource_type: 'issue',
      }))];
      if (events.length < perPage) break;
      
      page++;
    }

    // Fetch assignment events
    page = 1;
    while (true) {
      const events = await fetchFromGitLab(
        `/projects/${projectId}/issues/${issueIid}/notes`,
        { per_page: perPage, page }
      );
      
      if (events.length === 0) break;

      // Filter and transform system notes about assignments
      const assignmentEvents = events
        .filter((note: GitLabNote) => note.system && note.body.includes('assigned to'))
        .map((note: GitLabNote) => {
          const assigneeMatch = note.body.match(/@([^\s]+)/);
          return {
            id: note.id,
            user: note.author,
            created_at: note.created_at,
            resource_type: 'issue',
            action: 'assignee',
            assignee: assigneeMatch ? { 
              id: 0, // We don't have the ID from the note
              username: assigneeMatch[1]
            } : undefined
          };
        });

      allEvents = [...allEvents, ...assignmentEvents];
      if (events.length < perPage) break;
      
      page++;
    }

    return allEvents;
  };

  // Working hours configuration in UTC (10:00-19:00 GMT+2 -> 8:00-17:00 UTC)
  const WORK_START_HOUR_UTC = 8;
  const WORK_END_HOUR_UTC = 17;

  /**
   * Check if the given UTC date is a weekend
   */
  const isWeekend = (date: Date): boolean => {
    const day = date.getUTCDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  /**
   * Get working minutes in a specific day between two UTC timestamps
   * Returns minutes within working hours (8:00-17:00 UTC)
   */
  const getWorkingMinutesInDay = (start: Date, end: Date): number => {
    // If it's weekend in UTC, return 0
    if (isWeekend(start)) {
      return 0;
    }

    // Get hours and minutes in UTC
    const startHour = start.getUTCHours();
    const startMinute = start.getUTCMinutes();
    const endHour = end.getUTCHours();
    const endMinute = end.getUTCMinutes();

    console.log(`      Hours: ${startHour}:${startMinute} - ${endHour}:${endMinute} UTC`);

    // Calculate effective work start and end times
    const effectiveStartHour = Math.max(startHour, WORK_START_HOUR_UTC);
    const effectiveEndHour = Math.min(endHour, WORK_END_HOUR_UTC);

    console.log(`      Effective hours: ${effectiveStartHour}:${startMinute} - ${effectiveEndHour}:${endMinute} UTC`);

    // If end time is before work start or start time is after work end, return 0
    if (endHour < WORK_START_HOUR_UTC || startHour >= WORK_END_HOUR_UTC) {
      console.log(`      Outside working hours, returning 0 minutes`);
      return 0;
    }

    // Calculate minutes
    let minutes = 0;

    // If start and end are in the same hour
    if (effectiveStartHour === effectiveEndHour) {
      // If within working hours
      if (effectiveStartHour >= WORK_START_HOUR_UTC && effectiveStartHour < WORK_END_HOUR_UTC) {
        minutes = endMinute - startMinute;
        console.log(`      Same hour: ${minutes} minutes`);
      }
    } else {
      // Add full hours in between
      const fullHours = effectiveEndHour - effectiveStartHour - 1;
      if (fullHours > 0) {
        minutes += fullHours * 60;
        console.log(`      Full hours in between: ${fullHours} hours (${fullHours * 60} minutes)`);
      }

      // Add minutes from first hour
      if (startHour === effectiveStartHour) {
        minutes += 60 - startMinute;
        console.log(`      First hour: ${60 - startMinute} minutes`);
      }

      // Add minutes from last hour
      if (endHour === effectiveEndHour && endHour <= WORK_END_HOUR_UTC) {
        minutes += endMinute;
        console.log(`      Last hour: ${endMinute} minutes`);
      }
    }

    console.log(`      Total minutes for this segment: ${minutes}`);
    return Math.max(0, minutes);
  };

  /**
   * Calculate working time between two dates in milliseconds
   */
  const calculateWorkingTime = (startDate: Date, endDate: Date): number => {
    let totalMinutes = 0;
    const currentDate = new Date(startDate);
    const endDay = new Date(endDate);

    console.log(`  Calculating working time from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Process each day
    while (currentDate.getTime() <= endDay.getTime()) {
      // For the current day, calculate working minutes
      const dayStart = currentDate.getTime() === startDate.getTime() 
        ? startDate 
        : new Date(currentDate.setUTCHours(WORK_START_HOUR_UTC, 0, 0, 0));

      const dayEnd = currentDate.getTime() === endDay.getTime() 
        ? endDate 
        : new Date(currentDate.setUTCHours(WORK_END_HOUR_UTC, 0, 0, 0));

      // Get working minutes for this day
      const dayMinutes = getWorkingMinutesInDay(dayStart, dayEnd);
      
      const isWeekendDay = isWeekend(currentDate);
      console.log(`    Day ${currentDate.toISOString().split('T')[0]}: ${dayMinutes} minutes (${isWeekendDay ? 'weekend' : 'workday'})`);
      
      totalMinutes += dayMinutes;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setUTCHours(0, 0, 0, 0);
    }

    const totalMs = totalMinutes * 60 * 1000;
    console.log(`  Total working time: ${totalMinutes} minutes (${totalMinutes / 60} hours)`);
    
    return totalMs; // Convert minutes to milliseconds
  };

  const calculateInProgressDuration = (events: IssueEvent[], issueCreatedAt: string, currentAssignee: string, isClosed: boolean): { activeTime: number, totalTime: number } => {
    let activeTime = 0;
    let lastInProgressStart: string | null = null;
    let lastPausedStart: string | null = null;
    
    // Sort events by creation date
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.log('===== TIME CALCULATION DEBUG =====');
    console.log('Issue created at:', issueCreatedAt);
    console.log('Current assignee:', currentAssignee);
    console.log('Is closed:', isClosed);

    // Find when the current assignee was assigned
    let assignmentTime: string | null = null;
    for (const event of sortedEvents) {
      if (event.resource_type === 'issue' && 
          event.action === 'assignee' && 
          event.assignee?.username === currentAssignee) {
        assignmentTime = event.created_at;
        console.log('Assignment time found:', assignmentTime);
        break;
      }
    }

    console.log('In-progress periods:');
    // Calculate in-progress time
    for (const event of sortedEvents) {
      if (event.label) {
        if (event.label.name === 'in-progress') {
          if (event.action === 'add') {
            lastInProgressStart = event.created_at;
            lastPausedStart = null;
            console.log(`Started in-progress at: ${lastInProgressStart}`);
          } else if (event.action === 'remove' && lastInProgressStart) {
            const startDate = new Date(lastInProgressStart);
            const endDate = new Date(event.created_at);
            const duration = calculateWorkingTime(startDate, endDate);
            console.log(`Ended in-progress at: ${event.created_at}`);
            console.log(`Duration for this period: ${duration}ms (${duration / (1000 * 60 * 60)} hours)`);
            activeTime += duration;
            lastInProgressStart = null;
          }
        } else if (event.label.name === 'paused') {
          if (event.action === 'add') {
            // If we were in progress, end the in-progress period
            if (lastInProgressStart) {
              const startDate = new Date(lastInProgressStart);
              const endDate = new Date(event.created_at);
              const duration = calculateWorkingTime(startDate, endDate);
              console.log(`Paused at: ${event.created_at} (was in-progress)`);
              console.log(`Duration until pause: ${duration}ms (${duration / (1000 * 60 * 60)} hours)`);
              activeTime += duration;
              lastInProgressStart = null;
            } else {
              console.log(`Paused at: ${event.created_at} (was not in-progress)`);
            }
            lastPausedStart = event.created_at;
          }
        }
      }
    }

    // If the issue is still in progress, count duration until now
    const now = new Date();
    
    if (lastInProgressStart && !lastPausedStart) {
      const startDate = new Date(lastInProgressStart);
      const duration = calculateWorkingTime(startDate, now);
      console.log(`Still in-progress until now: ${now.toISOString()}`);
      console.log(`Duration until now: ${duration}ms (${duration / (1000 * 60 * 60)} hours)`);
      activeTime += duration;
    }

    // Calculate total time from assignment time to last non-paused state
    const startTime = assignmentTime || issueCreatedAt;
    const startDate = new Date(startTime);
    
    // For total time calculation, use the last event before pause or current time
    let endTime: Date;
    if (isClosed) {
      endTime = sortedEvents.length > 0 ? new Date(sortedEvents[sortedEvents.length - 1].created_at) : now;
    } else if (lastPausedStart) {
      endTime = new Date(lastPausedStart);
    } else {
      endTime = now;
    }

    const totalTime = calculateWorkingTime(startDate, endTime);
    
    console.log(`Total active time: ${activeTime}ms (${activeTime / (1000 * 60 * 60)} hours)`);
    console.log(`Total time from start: ${totalTime}ms (${totalTime / (1000 * 60 * 60)} hours)`);
    console.log('===== END DEBUG =====');

    return { activeTime, totalTime };
  };

  const getIssueWithEvents = async (
    projectId: number,
    issueIid: number
  ): Promise<IssueWithEvents> => {
    try {
      const [issue, events] = await Promise.all([
        fetchFromGitLab(`/projects/${projectId}/issues/${issueIid}`),
        getIssueEvents(projectId, issueIid),
      ]);

      const currentAssignee = issue.assignee?.username;
      const isClosed = issue.state === 'closed';
      const { activeTime, totalTime } = calculateInProgressDuration(events, issue.created_at, currentAssignee, isClosed);

      return {
        ...issue,
        events,
        inProgressDuration: activeTime,
        totalTimeFromStart: totalTime,
      };
    } catch (error) {
      throw error;
    }
  };

  const getProjectIssues = async (
    projectId: number,
    assigneeUsernames?: string[]
  ): Promise<IssueWithEvents[]> => {
    if (!assigneeUsernames || assigneeUsernames.length === 0) {
      return [];
    }

    let allIssues: Issue[] = [];

    // Fetch issues for each assignee
    for (const username of assigneeUsernames) {
      let page = 1;
      const perPage = 100;
      
      while (true) {
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
      const members = await fetchFromGitLab(`/projects/${projectId}/members/all`, {
        per_page: perPage,
        page
      }) as GitLabMember[];

      if (members.length === 0) break;

      allMembers = [...allMembers, ...members];
      if (members.length < perPage) break;

      page++;
    }
    
    return allMembers.map(member => ({
      id: member.id,
      username: member.username,
    }));
  }

  const getIssueRelatedMergeRequests = async (
    projectId: number,
    issueIid: number
  ): Promise<MergeRequest[]> => {
    try {
      const mergeRequests = await fetchFromGitLab(
        `/projects/${projectId}/issues/${issueIid}/related_merge_requests`,
        { state: 'opened' }
      );
      
      return mergeRequests;
    } catch (error) {
      throw error;
    }
  };

  return {
    getIssueWithEvents,
    getProjectIssues,
    getProjectMembers,
    getIssueRelatedMergeRequests,
  };
}; 
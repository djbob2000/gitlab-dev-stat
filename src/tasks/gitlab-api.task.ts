import { LABELS } from '@/src/constants/labels';

// Types for our module
export interface GitLabConfig {
  baseUrl: string;
  token: string;
  projectPath: string; // e.g. "fernir2/saas-kit"
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

export interface GitLabUser {
  id: number;
  username: string;
}

// GitLab API client
export const createGitLabClient = ({ baseUrl, token }: GitLabConfig) => {
  const fetchFromGitLab = async (
    endpoint: string,
    params: Record<string, string | number> = {}
  ) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    }

    const url = `${baseUrl}/api/v4${endpoint}${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'PRIVATE-TOKEN': token,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details available');
        throw new Error(
          `GitLab API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout: ${url}`);
        }
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`);
    }
  };

  const getIssueEvents = async (projectId: number, issueIid: number): Promise<IssueEvent[]> => {
    try {
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

        allEvents = [
          ...allEvents,
          ...events.map(
            (event: {
              id: number;
              user: { id: number; username: string };
              created_at: string;
              action: string;
              assignee?: { id: number; username: string };
            }) => ({
              ...event,
              resource_type: 'issue',
            })
          ),
        ];
        if (events.length < perPage) break;

        page++;
      }

      // Fetch assignment events
      page = 1;
      while (true) {
        const events = await fetchFromGitLab(`/projects/${projectId}/issues/${issueIid}/notes`, {
          per_page: perPage,
          page,
        });

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
              assignee: assigneeMatch
                ? {
                    id: 0, // We don't have the ID from the note
                    username: assigneeMatch[1],
                  }
                : undefined,
            };
          });

        allEvents = [...allEvents, ...assignmentEvents];
        if (events.length < perPage) break;

        page++;
      }

      return allEvents;
    } catch (error) {
      console.error(
        `Error fetching issue events for projectId=${projectId}, issueIid=${issueIid}:`,
        error
      );
      throw error;
    }
  };

  // Working hours configuration in UTC
  const WORK_START_HOUR_UTC = 8;
  const WORK_END_HOUR_UTC = 17;
  const MAX_WORKING_HOURS_PER_DAY = 8; // Maximum of 8 working hours per day

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
    const startHour = start.getUTCHours();
    const startMinute = start.getUTCMinutes();
    const endHour = end.getUTCHours();
    const endMinute = end.getUTCMinutes();

    if (endHour < WORK_START_HOUR_UTC || startHour >= WORK_END_HOUR_UTC) {
      return 0;
    }

    const effectiveStartHour = Math.max(startHour, WORK_START_HOUR_UTC);
    const effectiveEndHour = Math.min(endHour, WORK_END_HOUR_UTC);
    const effectiveStartMinute = startHour === effectiveStartHour ? startMinute : 0;
    const effectiveEndMinute = endHour === effectiveEndHour ? endMinute : 0;

    let minutes = 0;

    if (effectiveStartHour === effectiveEndHour) {
      minutes = effectiveEndMinute - effectiveStartMinute;
    } else {
      const fullHours = effectiveEndHour - effectiveStartHour - 1;
      if (fullHours > 0) {
        minutes += fullHours * 60;
      }
      minutes += 60 - effectiveStartMinute;
      minutes += effectiveEndMinute;
    }

    return Math.max(0, minutes);
  };

  /**
   * Calculate working time between two dates in milliseconds
   * Limited to a maximum of 8 working hours per day
   */
  const calculateWorkingTime = (startDate: Date, endDate: Date): number => {
    // Check for valid dates
    if (startDate > endDate) {
      return 0;
    }

    let totalMinutes = 0;
    const currentDate = new Date(startDate);
    const endDay = new Date(endDate);

    // Normalize the end date to end of day
    endDay.setUTCHours(23, 59, 59, 999);

    // Infinite loop protection - maximum 365 days
    const maxDays = 365;
    let daysProcessed = 0;

    while (currentDate.getTime() <= endDay.getTime()) {
      // Protection against infinite loop
      daysProcessed++;
      if (daysProcessed > maxDays) {
        break;
      }

      const isWeekendDay = isWeekend(currentDate);

      if (isWeekendDay) {
        // Important: increment date by 1 day and reset time
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setUTCHours(0, 0, 0, 0);
        continue;
      }

      let dayStart;
      if (currentDate.getTime() === startDate.getTime()) {
        dayStart = new Date(startDate);
      } else {
        dayStart = new Date(currentDate);
        dayStart.setUTCHours(WORK_START_HOUR_UTC, 0, 0, 0);
      }

      let dayEnd;
      if (
        currentDate.getUTCFullYear() === endDay.getUTCFullYear() &&
        currentDate.getUTCMonth() === endDay.getUTCMonth() &&
        currentDate.getUTCDate() === endDay.getUTCDate()
      ) {
        dayEnd = new Date(endDate);
      } else {
        dayEnd = new Date(currentDate);
        dayEnd.setUTCHours(WORK_END_HOUR_UTC, 0, 0, 0);
      }

      const dayMinutes = getWorkingMinutesInDay(dayStart, dayEnd);
      totalMinutes += Math.min(dayMinutes, MAX_WORKING_HOURS_PER_DAY * 60);

      // Important: correctly increment date to the next day
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setUTCHours(0, 0, 0, 0);

      // Check that the date actually changed
      if (nextDate.getTime() === currentDate.getTime()) {
        break;
      }

      currentDate.setTime(nextDate.getTime());
    }

    return totalMinutes * 60 * 1000;
  };

  const calculateInProgressDuration = (
    events: IssueEvent[],
    issueCreatedAt: string,
    currentAssignee: string,
    isClosed: boolean,
    closedAt: string | null
  ): { activeTime: number; totalTime: number } => {
    let activeTime = 0;
    let lastInProgressStart: string | null = null;
    let lastPausedStart: string | null = null;
    const dailyWorkTimeMs: Record<string, number> = {};

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // Find when the issue was assigned to the current assignee
    let assignmentTime: string | null = null;
    for (const event of sortedEvents) {
      if (
        event.resource_type === 'issue' &&
        event.action === 'assignee' &&
        event.assignee?.username === currentAssignee
      ) {
        assignmentTime = event.created_at;
        break;
      }
    }

    // Only process "in-progress" events that happened after assignment
    for (const event of sortedEvents) {
      if (assignmentTime && event.created_at < assignmentTime) {
        continue;
      }

      if (event.label) {
        if (event.label.name === LABELS.IN_PROGRESS) {
          if (event.action === 'add') {
            lastInProgressStart = event.created_at;
            lastPausedStart = null;
          } else if (event.action === 'remove' && lastInProgressStart) {
            const startDate = new Date(lastInProgressStart);
            const endDate = new Date(event.created_at);

            const periodWorkTime = calculateWorkingTime(startDate, endDate);

            distributeTimeByDays(startDate, endDate, periodWorkTime, dailyWorkTimeMs);
            lastInProgressStart = null;
          }
        } else if (event.label.name === LABELS.PAUSED) {
          if (event.action === 'add' && lastInProgressStart) {
            const startDate = new Date(lastInProgressStart);
            const endDate = new Date(event.created_at);

            const periodWorkTime = calculateWorkingTime(startDate, endDate);

            distributeTimeByDays(startDate, endDate, periodWorkTime, dailyWorkTimeMs);
            lastInProgressStart = null;
            lastPausedStart = event.created_at;
          }
        }
      }
    }

    const now = new Date();

    if (lastInProgressStart && !lastPausedStart) {
      const startDate = new Date(lastInProgressStart);

      const periodWorkTime = calculateWorkingTime(startDate, now);

      distributeTimeByDays(startDate, now, periodWorkTime, dailyWorkTimeMs);
    }

    // Function for distributing time by days and applying restriction
    function distributeTimeByDays(
      start: Date,
      end: Date,
      totalTime: number,
      dailyTimeMap: Record<string, number>
    ) {
      // Iterate through all days between start and end
      let currentDate = new Date(start);
      currentDate.setUTCHours(0, 0, 0, 0); // Start of the day

      const endDay = new Date(end);
      endDay.setUTCHours(23, 59, 59, 999); // End of the day

      // Determine the number of working days in the period
      let workDaysCount = 0;
      while (currentDate <= endDay) {
        if (!isWeekend(currentDate)) {
          workDaysCount++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (workDaysCount === 0) return; // No working days

      // Distribute time evenly among working days
      const timePerDay = totalTime / workDaysCount;

      // Iterate through days again and add time
      currentDate = new Date(start);
      currentDate.setUTCHours(0, 0, 0, 0);

      while (currentDate <= endDay) {
        if (!isWeekend(currentDate)) {
          const dayKey = `${currentDate.getUTCFullYear()}-${String(
            currentDate.getUTCMonth() + 1
          ).padStart(2, '0')}-${String(currentDate.getUTCDate()).padStart(2, '0')}`;

          if (!dailyTimeMap[dayKey]) {
            dailyTimeMap[dayKey] = 0;
          }

          dailyTimeMap[dayKey] += timePerDay;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Restrict time for each day to 8 hours and sum up
    for (const day in dailyWorkTimeMs) {
      const maxDailyTimeMs = MAX_WORKING_HOURS_PER_DAY * 60 * 60 * 1000;
      const originalTime = dailyWorkTimeMs[day];
      const restrictedTime = Math.min(originalTime, maxDailyTimeMs);
      activeTime += restrictedTime;
    }

    const startTime = assignmentTime || issueCreatedAt;
    const startDate = new Date(startTime);
    const endTime = isClosed && closedAt ? new Date(closedAt) : new Date();
    const totalTime = endTime.getTime() - startDate.getTime();

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
      const { activeTime, totalTime } = calculateInProgressDuration(
        events,
        issue.created_at,
        currentAssignee,
        isClosed,
        issue.closed_at
      );

      return {
        ...issue,
        events,
        inProgressDuration: activeTime,
        totalTimeFromStart: totalTime,
      };
    } catch (error) {
      console.error(
        `Error getting issue with events for projectId=${projectId}, issueIid=${issueIid}:`,
        error
      );
      throw error;
    }
  };

  /**
   * Get user IDs for the given usernames
   * @param projectId The GitLab project ID
   * @param usernames Array of usernames to convert to IDs
   * @returns Map of usernames to user IDs
   */
  const getUserIdsByUsernames = async (
    projectId: number,
    usernames: string[]
  ): Promise<Map<string, number>> => {
    try {
      const members = await getProjectMembers(projectId);
      const usernameToIdMap = new Map<string, number>();

      for (const username of usernames) {
        const member = members.find(m => m.username === username);
        if (member) {
          usernameToIdMap.set(username, member.id);
        }
      }

      return usernameToIdMap;
    } catch (error) {
      console.error(`Error getting user IDs for projectId=${projectId}:`, error);
      throw error;
    }
  };

  const getProjectIssues = async (
    projectId: number,
    assigneeUsernames?: string[],
    assigneeIds?: number[]
  ): Promise<IssueWithEvents[]> => {
    if (
      (!assigneeUsernames || assigneeUsernames.length === 0) &&
      (!assigneeIds || assigneeIds.length === 0)
    ) {
      return [];
    }

    let allIssues: Issue[] = [];
    const MAX_ISSUES = 50;

    if (assigneeIds && assigneeIds.length > 0) {
      for (const userId of assigneeIds) {
        let page = 1;
        const perPage = Math.min(MAX_ISSUES, 100);

        while (true) {
          if (allIssues.length >= MAX_ISSUES) {
            break;
          }

          const issues = await fetchFromGitLab(`/projects/${projectId}/issues`, {
            assignee_id: userId,
            state: 'opened',
            per_page: perPage,
            page,
          });

          if (issues.length === 0) break;

          allIssues = [...allIssues, ...issues].slice(0, MAX_ISSUES);
          if (issues.length < perPage) break;

          page++;
        }
      }
    } else if (assigneeUsernames && assigneeUsernames.length > 0) {
      const usernameToIdMap = await getUserIdsByUsernames(projectId, assigneeUsernames);

      for (const username of assigneeUsernames) {
        if (allIssues.length >= MAX_ISSUES) {
          break;
        }

        const userId = usernameToIdMap.get(username);

        if (!userId) {
          continue;
        }

        let page = 1;
        const perPage = Math.min(MAX_ISSUES, 100);

        while (true) {
          if (allIssues.length >= MAX_ISSUES) break;

          const issues = await fetchFromGitLab(`/projects/${projectId}/issues`, {
            assignee_id: userId,
            state: 'opened',
            per_page: perPage,
            page,
          });

          if (issues.length === 0) break;

          allIssues = [...allIssues, ...issues].slice(0, MAX_ISSUES);
          if (issues.length < perPage) break;

          page++;
        }
      }
    }

    const issuesWithEvents = await Promise.allSettled(
      allIssues
        .filter((issue): issue is Issue => typeof issue.iid === 'number')
        .map(async issue => {
          const result = await getIssueWithEvents(projectId, issue.iid);
          return result;
        })
    ).then(results => {
      const fulfilled = results.filter(
        (result): result is PromiseFulfilledResult<IssueWithEvents> => result.status === 'fulfilled'
      );
      return fulfilled.map(result => result.value);
    });

    return issuesWithEvents;
  };

  async function getProjectMembers(projectId: number): Promise<GitLabUser[]> {
    try {
      let page = 1;
      const perPage = 100;
      let allMembers: GitLabUser[] = [];

      while (true) {
        const members = (await fetchFromGitLab(`/projects/${projectId}/members/all`, {
          per_page: perPage,
          page,
        })) as GitLabUser[];

        if (members.length === 0) break;

        allMembers = [...allMembers, ...members];
        if (members.length < perPage) break;

        page++;
      }

      return allMembers.map(member => ({
        id: member.id,
        username: member.username,
      }));
    } catch (error) {
      console.error(`Error getting project members for projectId=${projectId}:`, error);
      throw error;
    }
  }

  const getIssueRelatedMergeRequests = async (
    projectId: number,
    issueIid: number
  ): Promise<MergeRequest[]> => {
    return fetchFromGitLab(`/projects/${projectId}/issues/${issueIid}/related_merge_requests`, {
      state: 'opened',
    });
  };

  // Adding a new function to get MR label history
  const getMergeRequestLabelEvents = async (
    projectId: number,
    mrIid: number
  ): Promise<IssueEvent[]> => {
    try {
      let page = 1;
      const perPage = 100;
      let allEvents: IssueEvent[] = [];

      // Fetch label events for merge request
      while (true) {
        try {
          const events = await fetchFromGitLab(
            `/projects/${projectId}/merge_requests/${mrIid}/resource_label_events`,
            { per_page: perPage, page }
          );

          if (events.length === 0) break;

          allEvents = [...allEvents, ...events];
          if (events.length < perPage) break;

          page++;
        } catch (error) {
          // If we get a 404, the MR might not exist or is not accessible
          if (error instanceof Error && error.message.includes('404 Not Found')) {
            console.warn(
              `MR #${mrIid} not found or inaccessible in project ${projectId}. Skipping.`
            );
            break;
          }
          throw error;
        }
      }

      return allEvents;
    } catch (error) {
      // Handle any other errors at the function level
      if (error instanceof Error && error.message.includes('404 Not Found')) {
        console.warn(
          `MR #${mrIid} not found or inaccessible in project ${projectId}. Returning empty array.`
        );
        return [];
      }
      throw error;
    }
  };

  return {
    getIssueWithEvents,
    getProjectIssues,
    getProjectMembers,
    getIssueRelatedMergeRequests,
    getUserIdsByUsernames,
    getMergeRequestLabelEvents,
  };
};

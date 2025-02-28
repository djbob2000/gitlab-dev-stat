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

  // Working hours configuration in UTC
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
    // Get hours and minutes in UTC
    const startHour = start.getUTCHours();
    const startMinute = start.getUTCMinutes();
    const endHour = end.getUTCHours();
    const endMinute = end.getUTCMinutes();

    console.log(`      Input time range: ${start.toUTCString()} - ${end.toUTCString()}`);
    console.log(`      Hours: ${startHour}:${startMinute} - ${endHour}:${endMinute} UTC`);
    console.log(`      Working hours: ${WORK_START_HOUR_UTC}:00 - ${WORK_END_HOUR_UTC}:00 UTC`);

    // If the entire period is outside working hours, return 0
    if (endHour < WORK_START_HOUR_UTC || startHour >= WORK_END_HOUR_UTC) {
      console.log(`      Outside working hours, returning 0 minutes`);
      return 0;
    }

    // Calculate effective work start and end times
    const effectiveStartHour = Math.max(startHour, WORK_START_HOUR_UTC);
    const effectiveEndHour = Math.min(endHour, WORK_END_HOUR_UTC);

    // Calculate effective minutes
    const effectiveStartMinute = startHour === effectiveStartHour ? startMinute : 0;
    const effectiveEndMinute = endHour === effectiveEndHour ? endMinute : 0;

    console.log(`      Effective hours: ${effectiveStartHour}:${effectiveStartMinute} - ${effectiveEndHour}:${effectiveEndMinute} UTC`);

    // Calculate minutes
    let minutes = 0;

    // If start and end are in the same hour
    if (effectiveStartHour === effectiveEndHour) {
      minutes = effectiveEndMinute - effectiveStartMinute;
      console.log(`      Same hour calculation: ${effectiveEndMinute} - ${effectiveStartMinute} = ${minutes} minutes`);
    } else {
      // Add full hours in between
      const fullHours = effectiveEndHour - effectiveStartHour - 1;
      if (fullHours > 0) {
        minutes += fullHours * 60;
        console.log(`      Full hours in between: ${fullHours} hours (${fullHours * 60} minutes)`);
      }

      // Add minutes from first hour
      minutes += 60 - effectiveStartMinute;
      console.log(`      First hour: ${60 - effectiveStartMinute} minutes (60 - ${effectiveStartMinute})`);

      // Add minutes from last hour
      minutes += effectiveEndMinute;
      console.log(`      Last hour: ${effectiveEndMinute} minutes`);
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

    console.log(`\n  Calculating working time from ${startDate.toISOString()} to ${endDate.toISOString()}`);
    console.log(`  Start date: ${startDate.toUTCString()} (${startDate.getUTCDay() === 0 ? 'Sunday' : startDate.getUTCDay() === 6 ? 'Saturday' : 'Weekday'})`);
    console.log(`  End date: ${endDate.toUTCString()} (${endDate.getUTCDay() === 0 ? 'Sunday' : endDate.getUTCDay() === 6 ? 'Saturday' : 'Weekday'})`);
    console.log(`  Working hours: ${WORK_START_HOUR_UTC}:00-${WORK_END_HOUR_UTC}:00 UTC`);
    
    // Process each day
    while (currentDate.getTime() <= endDay.getTime()) {
      const isWeekendDay = isWeekend(currentDate);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getUTCDay()];
      
      // Skip weekend days entirely
      if (isWeekendDay) {
        console.log(`    Day ${currentDate.toISOString().split('T')[0]} (${dayOfWeek}): 0 minutes (weekend)`);
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
        currentDate.setUTCHours(0, 0, 0, 0);
        continue;
      }
      
      // For the current day, calculate working minutes
      let dayStart;
      if (currentDate.getTime() === startDate.getTime()) {
        dayStart = new Date(startDate);
      } else {
        dayStart = new Date(currentDate);
        dayStart.setUTCHours(WORK_START_HOUR_UTC, 0, 0, 0);
      }

      let dayEnd;
      if (currentDate.getFullYear() === endDay.getFullYear() && 
          currentDate.getMonth() === endDay.getMonth() && 
          currentDate.getDate() === endDay.getDate()) {
        dayEnd = new Date(endDate);
      } else {
        dayEnd = new Date(currentDate);
        dayEnd.setUTCHours(WORK_END_HOUR_UTC, 0, 0, 0);
      }

      // Get working minutes for this day
      const dayMinutes = getWorkingMinutesInDay(dayStart, dayEnd);
      
      console.log(`    Day ${currentDate.toISOString().split('T')[0]} (${dayOfWeek}): ${dayMinutes} minutes (workday)`);
      
      totalMinutes += dayMinutes;

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setUTCHours(0, 0, 0, 0);
    }

    const totalMs = totalMinutes * 60 * 1000;
    console.log(`  Total working time: ${totalMinutes} minutes (${(totalMinutes / 60).toFixed(2)} hours)`);
    
    return totalMs; // Convert minutes to milliseconds
  };

  const calculateInProgressDuration = (events: IssueEvent[], issueCreatedAt: string, currentAssignee: string, isClosed: boolean, closedAt: string | null, issueIid: number): { activeTime: number, totalTime: number } => {
    let activeTime = 0;
    let lastInProgressStart: string | null = null;
    let lastPausedStart: string | null = null;
    
    // Sort events by creation date
    const sortedEvents = [...events].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    console.log(`\n===== TIME CALCULATION DEBUG FOR ISSUE #${issueIid} =====`);
    console.log('Issue created at:', issueCreatedAt);
    console.log('Current assignee:', currentAssignee);
    console.log('Is closed:', isClosed);
    console.log('Closed at:', closedAt);
    console.log('Total events:', sortedEvents.length);

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

    console.log('\nEvent timeline:');
    sortedEvents.forEach((event, index) => {
      console.log(`${index + 1}. ${event.created_at} - ${event.action} ${event.label?.name || event.resource_type || 'unknown'}`);
    });

    console.log('\nIn-progress periods from events:');
    // Calculate in-progress time
    const inProgressPeriods = [];
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
            
            // Store period details for summary
            inProgressPeriods.push({
              start: lastInProgressStart,
              end: event.created_at,
              durationMs: duration,
              durationHours: duration / (1000 * 60 * 60)
            });
            
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
              
              // Store period details for summary
              inProgressPeriods.push({
                start: lastInProgressStart,
                end: event.created_at,
                durationMs: duration,
                durationHours: duration / (1000 * 60 * 60)
              });
              
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
      
      // Store period details for summary
      inProgressPeriods.push({
        start: lastInProgressStart,
        end: now.toISOString(),
        durationMs: duration,
        durationHours: duration / (1000 * 60 * 60)
      });
      
      activeTime += duration;
    }

    // Calculate total time from assignment time to current time or closed_at
    const startTime = assignmentTime || issueCreatedAt;
    const startDate = new Date(startTime);
    
    // For total time calculation, use current time or closed_at if the issue is closed
    let endTime: Date;
    if (isClosed && closedAt) {
      endTime = new Date(closedAt);
      console.log(`Issue is closed, using closed_at time: ${closedAt}`);
    } else {
      endTime = new Date(); // Current time
      console.log(`Issue is not closed, using current time: ${endTime.toISOString()}`);
    }

    console.log(`\nCalculating total time from ${startDate.toISOString()} to ${endTime.toISOString()}`);
    
    // Calculate total time in milliseconds (full time, not just working hours)
    const totalTime = endTime.getTime() - startDate.getTime();
    console.log(`Total time (full calendar time): ${totalTime}ms (${totalTime / (1000 * 60 * 60)} hours)`);
    
    // Format times for comparison with table values
    const formatTimeOutput = (ms: number) => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
    };
    
    const formatTotalTime = (ms: number) => {
      // Count weekend days between start and end dates
      let weekendDays = 0;
      const tempDate = new Date(startDate);
      while (tempDate <= endTime) {
        if (tempDate.getUTCDay() === 0 || tempDate.getUTCDay() === 6) {
          weekendDays++;
        }
        tempDate.setUTCDate(tempDate.getUTCDate() + 1);
      }
      
      // Calculate total days excluding weekends
      const totalDays = Math.floor(ms / (24 * 60 * 60 * 1000));
      const weekendTimeMs = weekendDays * 24 * 60 * 60 * 1000;
      const adjustedMs = ms - weekendTimeMs;
      
      const seconds = Math.floor(adjustedMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      
      const remainingHours = hours % 24;
      const remainingMinutes = minutes % 60;
      
      console.log(`  Formatting total time: ${ms}ms`);
      console.log(`  Start date (UTC): ${startDate.toISOString()}`);
      console.log(`  End date (UTC): ${endTime.toISOString()}`);
      console.log(`  Total calendar days: ${totalDays}`);
      console.log(`  Weekend days subtracted: ${weekendDays}`);
      console.log(`  Adjusted time: ${adjustedMs}ms`);
      console.log(`  Total seconds: ${seconds}`);
      console.log(`  Total minutes: ${minutes}`);
      console.log(`  Total hours: ${hours}`);
      console.log(`  Days (24h): ${days}`);
      console.log(`  Remaining hours: ${remainingHours}`);
      console.log(`  Remaining minutes: ${remainingMinutes}`);
      
      return `${days > 0 ? days + 'd ' : ''}${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
    };
    
    console.log('\n===== SUMMARY =====');
    console.log('In-progress periods:');
    inProgressPeriods.forEach((period, index) => {
      console.log(`Period ${index + 1}: ${period.start} to ${period.end}`);
      console.log(`  Duration: ${formatTimeOutput(period.durationMs)} (${period.durationHours.toFixed(2)} hours)`);
    });
    
    console.log(`\nTotal in-progress time: ${formatTimeOutput(activeTime)} (${activeTime / (1000 * 60 * 60)} hours)`);
    
    console.log(`\nTotal time from start: ${formatTotalTime(totalTime)} (${totalTime / (1000 * 60 * 60)} hours)`);
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
      
      // Add debug logs for specific issues we're comparing
      if (issue.iid === 3446 || issue.iid === 3440 || issue.iid === 3366) {
        console.log(`\n\n========= DEBUGGING ISSUE #${issue.iid} =========`);
        console.log(`Title: ${issue.title}`);
        console.log(`Status: ${issue.state}`);
        console.log(`Labels: ${issue.labels?.join(', ')}`);
        console.log(`Closed at: ${issue.closed_at}`);
      }
      
      const { activeTime, totalTime } = calculateInProgressDuration(events, issue.created_at, currentAssignee, isClosed, issue.closed_at, issue.iid);
      
      // Add comparison with expected values
      if (issue.iid === 3446 || issue.iid === 3440 || issue.iid === 3366) {
        const formatTimeOutput = (ms: number) => {
          const seconds = Math.floor(ms / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const remainingMinutes = minutes % 60;
          return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
        };
        
        // Find assignment time
        let assignmentTime: string | null = null;
        for (const event of events) {
          if (event.resource_type === 'issue' && 
              event.action === 'assignee' && 
              event.assignee?.username === currentAssignee) {
            assignmentTime = event.created_at;
            break;
          }
        }
        
        const formatTotalTime = (ms: number) => {
          // Count weekend days between start and end dates
          let weekendDays = 0;
          const startTime = assignmentTime || issue.created_at;
          const startDate = new Date(startTime);
          const endDate = isClosed && issue.closed_at ? new Date(issue.closed_at) : new Date();
          
          const tempDate = new Date(startDate);
          while (tempDate <= endDate) {
            if (tempDate.getUTCDay() === 0 || tempDate.getUTCDay() === 6) {
              weekendDays++;
            }
            tempDate.setUTCDate(tempDate.getUTCDate() + 1);
          }
          
          // Calculate total days excluding weekends
          const totalDays = Math.floor(ms / (24 * 60 * 60 * 1000));
          const weekendTimeMs = weekendDays * 24 * 60 * 60 * 1000;
          const adjustedMs = ms - weekendTimeMs;
          
          const seconds = Math.floor(adjustedMs / 1000);
          const minutes = Math.floor(seconds / 60);
          const hours = Math.floor(minutes / 60);
          const days = Math.floor(hours / 24);
          
          const remainingHours = hours % 24;
          const remainingMinutes = minutes % 60;
          
          console.log(`  Formatting total time: ${ms}ms`);
          console.log(`  Start time: ${startTime} (${assignmentTime ? 'from assignment' : 'from creation'})`);
          console.log(`  Start date (UTC): ${startDate.toISOString()}`);
          console.log(`  End date (UTC): ${endDate.toISOString()}`);
          console.log(`  Total calendar days: ${totalDays}`);
          console.log(`  Weekend days subtracted: ${weekendDays}`);
          console.log(`  Adjusted time: ${adjustedMs}ms`);
          console.log(`  Total seconds: ${seconds}`);
          console.log(`  Total minutes: ${minutes}`);
          console.log(`  Total hours: ${hours}`);
          console.log(`  Days (24h): ${days}`);
          console.log(`  Remaining hours: ${remainingHours}`);
          console.log(`  Remaining minutes: ${remainingMinutes}`);
          
          return `${days > 0 ? days + 'd ' : ''}${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
        };
        
        console.log(`\nCalculated values:`);
        console.log(`In Progress: ${formatTimeOutput(activeTime)}`);
        console.log(`Total Time: ${formatTotalTime(totalTime)}`);
        
        let expectedInProgress = '';
        let expectedTotalTime = '';
        
        if (issue.iid === 3446) {
          expectedInProgress = '02:27';
          expectedTotalTime = '02:27';
        } else if (issue.iid === 3440) {
          expectedInProgress = '01:02';
          expectedTotalTime = '04:21';
        } else if (issue.iid === 3366) {
          expectedInProgress = '12:24';
          expectedTotalTime = '23d 00:22'; // Обновлено для нового формата
        }
        
        console.log(`\nExpected values from table:`);
        console.log(`In Progress: ${expectedInProgress}`);
        console.log(`Total Time: ${expectedTotalTime}`);
        
        console.log(`\nMatch?`);
        console.log(`In Progress: ${formatTimeOutput(activeTime) === expectedInProgress ? 'YES' : 'NO'}`);
        console.log(`Total Time: ${formatTotalTime(totalTime) === expectedTotalTime ? 'YES' : 'NO'}`);
        console.log(`========= END DEBUGGING ISSUE #${issue.iid} =========\n\n`);
      }

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
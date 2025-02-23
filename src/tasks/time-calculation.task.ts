import { IssueEvent, IssueWithEvents } from './gitlab-api.task';

export interface TimeInterval {
  start: Date;
  end: Date | null;
}

export interface IssueTimeStats {
  issueId: number;
  totalDuration: number; // in milliseconds
  intervals: TimeInterval[];
}

/**
 * Converts string date to Date object
 */
const parseDate = (dateStr: string): Date => new Date(dateStr);

/**
 * Calculates the duration between two dates in milliseconds
 */
const calculateDuration = (start: Date, end: Date): number => {
  return end.getTime() - start.getTime();
};

/**
 * Checks if two time intervals overlap
 */
const intervalsOverlap = (interval1: TimeInterval, interval2: TimeInterval): boolean => {
  const end1 = interval1.end || new Date();
  const end2 = interval2.end || new Date();
  
  return interval1.start < end2 && interval2.start < end1;
};

/**
 * Merges overlapping intervals into a single interval
 */
const mergeIntervals = (intervals: TimeInterval[]): TimeInterval[] => {
  if (intervals.length <= 1) return intervals;

  // Sort intervals by start time
  const sortedIntervals = [...intervals].sort((a, b) => 
    a.start.getTime() - b.start.getTime()
  );

  const mergedIntervals: TimeInterval[] = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = mergedIntervals[mergedIntervals.length - 1];

    if (intervalsOverlap(lastMergedInterval, currentInterval)) {
      // Merge intervals
      lastMergedInterval.end = currentInterval.end 
        ? (lastMergedInterval.end 
          ? new Date(Math.max(lastMergedInterval.end.getTime(), currentInterval.end.getTime()))
          : currentInterval.end)
        : null;
    } else {
      mergedIntervals.push(currentInterval);
    }
  }

  return mergedIntervals;
};

/**
 * Calculates total duration from intervals
 */
const calculateTotalDuration = (intervals: TimeInterval[]): number => {
  return intervals.reduce((total, interval) => {
    const end = interval.end || new Date();
    const duration = calculateDuration(interval.start, end);
    console.log(`Interval duration: ${duration}ms (${interval.start.toISOString()} -> ${end.toISOString()})`);
    return total + duration;
  }, 0);
};

/**
 * Extracts in-progress intervals from issue events
 */
const extractInProgressIntervals = (events: IssueEvent[]): TimeInterval[] => {
  console.log('Processing events:', events);
  const intervals: TimeInterval[] = [];
  let currentInterval: TimeInterval | null = null;

  // Sort events by creation date
  const sortedEvents = [...events].sort((a, b) => 
    parseDate(a.created_at).getTime() - parseDate(b.created_at).getTime()
  );

  console.log('Sorted events:', sortedEvents.map(e => ({
    date: e.created_at,
    action: e.action,
    label: e.label?.name
  })));

  for (const event of sortedEvents) {
    if (event.label?.name === 'in-progress') {
      if (event.action === 'add' && !currentInterval) {
        currentInterval = {
          start: parseDate(event.created_at),
          end: null
        };
        console.log(`Started in-progress interval at ${event.created_at}`);
      } else if (event.action === 'remove' && currentInterval) {
        currentInterval.end = parseDate(event.created_at);
        console.log(`Ended in-progress interval at ${event.created_at}`);
        intervals.push(currentInterval);
        currentInterval = null;
      }
    }
  }

  // If there's an open interval, add it
  if (currentInterval) {
    console.log(`Found open interval starting at ${currentInterval.start.toISOString()}`);
    intervals.push(currentInterval);
  }

  console.log(`Found ${intervals.length} in-progress intervals`);
  return intervals;
};

/**
 * Calculates time statistics for a single issue
 */
export const calculateIssueTimeStats = (issue: IssueWithEvents): IssueTimeStats => {
  console.log(`Calculating time stats for issue #${issue.iid}`);
  const intervals = extractInProgressIntervals(issue.events);
  const mergedIntervals = mergeIntervals(intervals);
  const totalDuration = calculateTotalDuration(mergedIntervals);

  console.log(`Total duration for issue #${issue.iid}: ${totalDuration}ms`);
  return {
    issueId: issue.id,
    totalDuration,
    intervals: mergedIntervals
  };
};

/**
 * Calculates time statistics for multiple issues
 */
export const calculateBulkIssuesTimeStats = (issues: IssueWithEvents[]): IssueTimeStats[] => {
  console.log(`Calculating time stats for ${issues.length} issues`);
  return issues.map(calculateIssueTimeStats);
};

/**
 * Formats duration in milliseconds to human readable string in format "Xd HH:MM"
 */
export const formatDuration = (durationMs: number): string => {
  if (!durationMs || isNaN(durationMs)) return '00:00';

  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  
  // Always show hours and minutes in HH:MM format
  const timeStr = `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
  parts.push(timeStr);

  return parts.join(' ');
}; 
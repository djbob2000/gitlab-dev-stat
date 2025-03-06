// Re-export everything from the modular structure
export * from './time-calculation/index';

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
  const sortedIntervals = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedIntervals: TimeInterval[] = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = mergedIntervals[mergedIntervals.length - 1];

    if (intervalsOverlap(lastMergedInterval, currentInterval)) {
      // Merge intervals
      lastMergedInterval.end = currentInterval.end
        ? lastMergedInterval.end
          ? new Date(Math.max(lastMergedInterval.end.getTime(), currentInterval.end.getTime()))
          : currentInterval.end
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
    return total + duration;
  }, 0);
};

/**
 * Extracts in-progress intervals from issue events
 */
const extractInProgressIntervals = (events: IssueEvent[]): TimeInterval[] => {
  const intervals: TimeInterval[] = [];
  let currentInterval: TimeInterval | null = null;

  // Sort events by creation date
  const sortedEvents = [...events].sort(
    (a, b) => parseDate(a.created_at).getTime() - parseDate(b.created_at).getTime()
  );

  for (const event of sortedEvents) {
    if (event.label?.name === 'in-progress') {
      if (event.action === 'add' && !currentInterval) {
        currentInterval = {
          start: parseDate(event.created_at),
          end: null,
        };
      } else if (event.action === 'remove' && currentInterval) {
        currentInterval.end = parseDate(event.created_at);
        intervals.push(currentInterval);
        currentInterval = null;
      }
    }
  }

  // If there's an open interval, add it
  if (currentInterval) {
    intervals.push(currentInterval);
  }

  return intervals;
};

/**
 * Calculates time statistics for a single issue
 */
export const calculateIssueTimeStats = (issue: IssueWithEvents): IssueTimeStats => {
  const intervals = extractInProgressIntervals(issue.events);
  const mergedIntervals = mergeIntervals(intervals);
  const totalDuration = calculateTotalDuration(mergedIntervals);

  return {
    issueId: issue.id,
    totalDuration,
    intervals: mergedIntervals,
  };
};

/**
 * Calculates time statistics for multiple issues
 */
export const calculateBulkIssuesTimeStats = (issues: IssueWithEvents[]): IssueTimeStats[] => {
  return issues.map(calculateIssueTimeStats);
};

/**
 * Formats duration in milliseconds into "HH:MM" format (hours and minutes only)
 * for the In Progress column
 */
export const formatHoursAndMinutes = (durationMs: number): string => {
  if (!durationMs || isNaN(durationMs)) return '';

  // Convert milliseconds to hours and minutes
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  // Format as "HH:MM"
  return `${String(hours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`;
};

/**
 * Formats duration in milliseconds into "Xd HH:MM" format
 * where d represents calendar days (24 hours per day), excluding weekends
 */
export const formatDuration = (durationMs: number): string => {
  if (!durationMs || isNaN(durationMs)) return '';

  // Calculate weekends to subtract
  const startDate = new Date(Date.now() - durationMs);
  const endDate = new Date();

  // Count weekend days between start and end dates
  let weekendDays = 0;
  const tempDate = new Date(startDate);
  while (tempDate <= endDate) {
    if (tempDate.getUTCDay() === 0 || tempDate.getUTCDay() === 6) {
      weekendDays++;
    }
    tempDate.setUTCDate(tempDate.getUTCDate() + 1);
  }

  // Subtract weekend time from total milliseconds
  const weekendTimeMs = weekendDays * 24 * 60 * 60 * 1000;
  const adjustedMs = durationMs - weekendTimeMs;

  const seconds = Math.floor(adjustedMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  // Calculate days based on 24-hour periods
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMinutes = minutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);

  // Always display hours and minutes in HH:MM format
  parts.push(
    `${String(remainingHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`
  );

  return parts.join(' ');
};

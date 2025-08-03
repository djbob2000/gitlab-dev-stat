import { TimeInterval, IssueTimeTrackingStats } from '../types/gitlab/base';
import { IssueEvent, IssueWithEvents } from './gitlab-api.task';
import { LABELS } from '@/constants/labels';

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
    if (event.label?.name === LABELS.IN_PROGRESS) {
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
export const calculateIssueTimeStats = (issue: IssueWithEvents): IssueTimeTrackingStats => {
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
export const calculateBulkIssuesTimeStats = (
  issues: IssueWithEvents[]
): IssueTimeTrackingStats[] => {
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

  // Handle negative or zero duration
  if (durationMs <= 0) return '00:00';

  const now = Date.now();
  const startTime = now - durationMs;
  const startDate = new Date(startTime);

  // Check if action was required on a weekend
  const isWeekend = [0, 6].includes(startDate.getDay());

  // Adjust start time to next Monday if needed
  let effectiveStartTime = startTime;
  if (isWeekend) {
    // Calculate days until Monday (Sunday: +1, Saturday: +2)
    const daysUntilMonday = startDate.getDay() === 0 ? 1 : 2;

    // Create date for next Monday
    const nextMonday = new Date(startDate);
    nextMonday.setDate(startDate.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    // If next Monday is in the future, return "00:00"
    if (nextMonday.getTime() > now) return '00:00';

    effectiveStartTime = nextMonday.getTime();
  }

  // Calculate workdays duration (excluding weekends)
  const effectiveDuration = now - effectiveStartTime;
  let workingTimeMs = effectiveDuration;

  // Subtract weekend days between effective start and now
  const daysBetween = Math.floor(effectiveDuration / (24 * 60 * 60 * 1000));
  if (daysBetween > 0) {
    // Count full weekend days
    const startDay = new Date(effectiveStartTime).getDay();
    let weekendCount = Math.floor(daysBetween / 7) * 2; // Complete weeks × 2 days

    // Add remaining weekend days
    const remainingDays = daysBetween % 7;

    // Count Saturdays and Sundays in the remaining days
    for (let day = startDay + 1; day <= startDay + remainingDays; day++) {
      const dayOfWeek = day % 7;
      if (dayOfWeek === 0 || dayOfWeek === 6) weekendCount++;
    }

    // Subtract weekend time
    workingTimeMs -= weekendCount * 24 * 60 * 60 * 1000;
  }

  // Ensure we don't have negative time
  workingTimeMs = Math.max(0, workingTimeMs);

  // Format the result
  const hours = Math.floor(workingTimeMs / (60 * 60 * 1000));
  const minutes = Math.floor((workingTimeMs % (60 * 60 * 1000)) / (60 * 1000));
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${String(remainingHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);

  return parts.join(' ');
};

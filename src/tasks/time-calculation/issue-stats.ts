import { IssueEvent, IssueWithEvents } from '../gitlab-api.task';
import { parseDate, mergeIntervals, calculateTotalDuration } from './interval-utils';
import { TimeInterval, IssueTimeStats } from './types';

/**
 * Extracts intervals when an issue was in progress
 */
export const extractInProgressIntervals = (events: IssueEvent[]): TimeInterval[] => {
  if (!events || events.length === 0) return [];

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const intervals: TimeInterval[] = [];
  let currentInterval: TimeInterval | null = null;

  for (const event of sortedEvents) {
    if (event.action === 'add' && event.label?.name === 'in-progress') {
      // Start tracking in-progress interval
      currentInterval = {
        start: parseDate(event.created_at),
        end: null,
      };
    } else if (
      currentInterval &&
      event.action === 'remove' &&
      event.label?.name === 'in-progress'
    ) {
      // End the current in-progress interval
      currentInterval.end = parseDate(event.created_at);
      intervals.push(currentInterval);
      currentInterval = null;
    }
  }

  // If an issue is still in progress, add the incomplete interval
  if (currentInterval) {
    intervals.push(currentInterval);
  }

  return intervals;
};

/**
 * Calculates time statistics for a single issue
 */
export const calculateIssueTimeStats = (issue: IssueWithEvents): IssueTimeStats => {
  // Extract intervals when the issue was in progress
  const intervals = extractInProgressIntervals(issue.events);

  // Merge overlapping intervals
  const mergedIntervals = mergeIntervals(intervals);

  // Calculate total duration
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
  return issues.map(issue => calculateIssueTimeStats(issue));
};

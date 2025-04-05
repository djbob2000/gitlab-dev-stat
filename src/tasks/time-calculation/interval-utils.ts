import { TimeInterval } from '../../types/gitlab/base';

/**
 * Converts string date to Date object
 */
export const parseDate = (dateStr: string): Date => new Date(dateStr);

/**
 * Calculates the duration between two dates in milliseconds
 */
export const calculateDuration = (start: Date, end: Date): number => {
  return end.getTime() - start.getTime();
};

/**
 * Checks if two time intervals overlap
 */
export const intervalsOverlap = (interval1: TimeInterval, interval2: TimeInterval): boolean => {
  const end1 = interval1.end || new Date();
  const end2 = interval2.end || new Date();

  return interval1.start < end2 && interval2.start < end1;
};

/**
 * Merges overlapping intervals into a single interval
 */
export const mergeIntervals = (intervals: TimeInterval[]): TimeInterval[] => {
  if (intervals.length <= 1) return intervals;

  // Sort intervals by start time
  const sortedIntervals = [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());

  const mergedIntervals: TimeInterval[] = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = mergedIntervals[mergedIntervals.length - 1];

    if (intervalsOverlap(lastMergedInterval, currentInterval)) {
      // Merge the intervals
      lastMergedInterval.end = currentInterval.end
        ? new Date(Math.max(currentInterval.end.getTime(), lastMergedInterval.end?.getTime() || 0))
        : currentInterval.end;
    } else {
      // Add as a new interval
      mergedIntervals.push(currentInterval);
    }
  }

  return mergedIntervals;
};

/**
 * Calculates the total duration of a set of intervals
 */
export const calculateTotalDuration = (intervals: TimeInterval[]): number => {
  return intervals.reduce((total, interval) => {
    const end = interval.end || new Date();
    return total + calculateDuration(interval.start, end);
  }, 0);
};

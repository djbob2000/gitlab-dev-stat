/**
 * Represents a time interval with a start and optional end time
 */
export interface TimeInterval {
  start: Date;
  end: Date | null;
}

/**
 * Statistics about time spent on an issue
 */
export interface IssueTimeStats {
  issueId: number;
  totalDuration: number; // in milliseconds
  intervals: TimeInterval[];
}

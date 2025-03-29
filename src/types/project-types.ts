export interface ProjectData {
  id: number;
  name: string;
  path: string;
  developers: { userId: number; username: string }[];
  data: IssueStatistics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

export const SELECTED_DEVELOPERS_PREFIX = 'selected-developers-';
export const PROJECT_NAME_PREFIX = 'project-name-';
export const PROJECT_PATH_PREFIX = 'project-path-';
export const PROJECT_TABLE_ID_PREFIX = 'project-';

// Re-exporting IssueStatistics from types file to avoid circular dependencies
import { IssueStatistics } from '@/src/types/types';
export type { IssueStatistics };

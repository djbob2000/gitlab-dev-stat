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

// Import the constants from the dedicated constants file
import {
  SELECTED_DEVELOPERS_PREFIX,
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
  PROJECT_TABLE_ID_PREFIX,
} from '@/src/constants/storage-keys';

// Re-export the constants
export {
  SELECTED_DEVELOPERS_PREFIX,
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
  PROJECT_TABLE_ID_PREFIX,
};

// Re-exporting IssueStatistics from types file to avoid circular dependencies
import { IssueStatistics } from '@/src/types/types';
export type { IssueStatistics };

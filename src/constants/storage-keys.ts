/**
 * Constants for localStorage keys used across the application
 */

/**
 * Constants for localStorage keys used across the application
 */

// Project-related keys
export const PROJECT_NAME_PREFIX = 'project-name-';
export const PROJECT_PATH_PREFIX = 'project-path-';

// Legacy constant - kept for backward compatibility during migration
export const SELECTED_DEVELOPERS_PREFIX = 'selected-developers-';

// New constants for exclusion-based tracking
export const EXCLUDED_DEVELOPERS_PREFIX = 'excluded-developers-';
export const SELECTED_PROJECTS_KEY = 'selectedProjects';
export const TRACKED_DEVELOPERS_KEY = 'tracked-developers';
export const PROJECT_ORDER_KEY = 'project-order';

// Per-project tracking keys
export const TRACKED_DEVELOPERS_PREFIX = 'tracked-developers-';
export const getTrackedDevelopersKey = (projectId: number): string =>
  `${TRACKED_DEVELOPERS_PREFIX}${projectId}`;

// Table-related keys
export const TABLE_COLUMN_WIDTHS_PREFIX = 'table-column-widths-';
export const TABLE_COLUMN_ORDER_PREFIX = 'table-column-order-';
export const PROJECT_TABLE_ID_PREFIX = 'project-';

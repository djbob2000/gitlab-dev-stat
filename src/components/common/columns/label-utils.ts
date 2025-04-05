import { MergeRequestInfo } from '@/src/types';
import { mrLabelColors } from './color-config';
import { LABELS, PRIORITY_LABEL_PATTERN } from '@/src/constants/labels';

/**
 * Gets the highest priority label from a list of labels
 */
export const getPriority = (labels: string[]) => {
  if (!labels || labels.length === 0) return '';

  // Find priority label matching p1-p9
  const priorityLabel = labels.find(label => PRIORITY_LABEL_PATTERN.test(label));
  return priorityLabel || '';
};

/**
 * Gets the highest priority status label
 */
export const getStatusPriority = (labels: string[]) => {
  if (!labels || labels.length === 0) return '';

  // Define priority order
  const statusPriority = [
    LABELS.BLOCKED,
    LABELS.PAUSED,
    LABELS.REVIEW,
    LABELS.IN_PROGRESS,
    LABELS.NOT_READY,
  ];

  // Return the first matching status
  for (const status of statusPriority) {
    if (labels.includes(status)) {
      return status;
    }
  }
  return '';
};

/**
 * Gets the priority of action required labels
 */
export const getActionRequiredPriority = (mrLabels: MergeRequestInfo[] = []) => {
  // Check if any merge request has an action-required label
  for (const mr of mrLabels) {
    const labels = mr.labels || [];

    // First priority: action-required3 label
    if (labels.includes(LABELS.ACTION_REQUIRED3)) {
      return {
        label: LABELS.ACTION_REQUIRED3,
        color: mrLabelColors[LABELS.ACTION_REQUIRED3],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }

    // Second priority: action-required2 label
    if (labels.includes(LABELS.ACTION_REQUIRED2)) {
      return {
        label: LABELS.ACTION_REQUIRED2,
        color: mrLabelColors[LABELS.ACTION_REQUIRED2],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }

    // Third priority: action-required label
    if (labels.includes(LABELS.ACTION_REQUIRED)) {
      return {
        label: LABELS.ACTION_REQUIRED,
        color: mrLabelColors[LABELS.ACTION_REQUIRED],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }
  }

  return null;
};

/**
 * Gets the status-update-commit label info if present
 */
export const getStatusUpdateCommitInfo = (mr: MergeRequestInfo) => {
  if (!mr.labels.includes(LABELS.STATUS_UPDATE_COMMIT)) {
    return null;
  }

  return {
    label: LABELS.STATUS_UPDATE_COMMIT,
    color: mrLabelColors[LABELS.STATUS_UPDATE_COMMIT],
    count: mr.statusUpdateCommitCount || 0,
    mrIid: mr.mrIid,
    url: mr.url,
    title: mr.title,
  };
};

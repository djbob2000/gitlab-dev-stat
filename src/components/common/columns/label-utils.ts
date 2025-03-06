import { MergeRequestLabels } from '@/src/types/types';
import { mrLabelColors } from './color-config';

/**
 * Gets the highest priority label from a list of labels
 */
export const getPriority = (labels: string[]) => {
  if (!labels || labels.length === 0) return '';

  // Find priority label matching p1-p8
  const priorityLabel = labels.find(label => /^p[1-8]$/.test(label));
  return priorityLabel || '';
};

/**
 * Gets the highest priority status label
 */
export const getStatusPriority = (labels: string[]) => {
  if (!labels || labels.length === 0) return '';

  // Define priority order
  const statusPriority = ['blocked', 'paused', 'review', 'in-progress'];

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
export const getActionRequiredPriority = (mrLabels: MergeRequestLabels[] = []) => {
  // Check if any merge request has an action-required label
  for (const mr of mrLabels) {
    const labels = mr.labels || [];

    // First priority: action-required3 label
    if (labels.includes('action-required3')) {
      return {
        label: 'action-required3',
        color: mrLabelColors['action-required3'],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }

    // Second priority: action-required2 label
    if (labels.includes('action-required2')) {
      return {
        label: 'action-required2',
        color: mrLabelColors['action-required2'],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }

    // Third priority: action-required label
    if (labels.includes('action-required')) {
      return {
        label: 'action-required',
        color: mrLabelColors['action-required'],
        mrIid: mr.mrIid,
        url: mr.url,
        title: mr.title,
      };
    }
  }

  return null;
};

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDuration, formatHoursAndMinutes } from '@/src/tasks/time-calculation.task';
import type { IssueStatistics } from '@/src/types';
import { LabelPill } from './label-pill';
import { priorityColors, statusColors, mrLabelColors } from './color-config';
import {
  getPriority,
  getStatusPriority,
  getActionRequiredPriority,
  getStatusUpdateCommitInfo,
} from './label-utils';
import { LABELS, LabelType, PRIORITY_LABEL_PATTERN } from '@/src/constants/labels';

/**
 * Column definitions for the data table
 */
export const columns: ColumnDef<IssueStatistics>[] = [
  {
    accessorKey: 'assignee.username',
    id: 'username',
    header: 'Dev',
    enableSorting: true,
    enableResizing: true,
    size: 150,
  },
  {
    accessorKey: 'labels',
    header: 'Pr',
    enableSorting: true,
    enableResizing: true,
    size: 70,
    sortingFn: (rowA, rowB) => {
      return getPriority(rowA.original.labels).localeCompare(getPriority(rowB.original.labels));
    },
    cell: ({ row }) => {
      const priorityLabel = getPriority(row.original.labels);
      if (!priorityLabel) return <div className="leading-none">-</div>;

      return (
        <div className="leading-none">
          <LabelPill
            text={priorityLabel}
            colorClass={priorityColors[priorityLabel] || 'bg-gray-200 text-gray-800'}
            className="text-xs"
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'labels',
    id: 'status',
    header: 'Status',
    enableSorting: true,
    enableResizing: true,
    size: 100,
    sortingFn: (rowA, rowB) => {
      const statusPriority = [
        LABELS.BLOCKED,
        LABELS.PAUSED,
        LABELS.REVIEW,
        LABELS.IN_PROGRESS,
        LABELS.NOT_READY,
        '',
      ];
      const statusA = getStatusPriority(rowA.original.labels);
      const statusB = getStatusPriority(rowB.original.labels);
      return statusPriority.indexOf(statusA) - statusPriority.indexOf(statusB);
    },
    cell: ({ row }) => {
      const statusLabel = getStatusPriority(row.original.labels);
      if (!statusLabel) return <div className="leading-none"></div>;

      return (
        <div className="leading-none">
          <LabelPill
            text={statusLabel}
            colorClass={statusColors[statusLabel] || 'bg-gray-200 text-gray-800'}
          />
        </div>
      );
    },
  },
  {
    accessorKey: 'mergeRequests',
    header: 'MR Labels',
    enableSorting: true,
    enableResizing: true,
    size: 220,
    sortingFn: (rowA, rowB) => {
      const actionA = getActionRequiredPriority(rowA.original.mergeRequests);
      const actionB = getActionRequiredPriority(rowB.original.mergeRequests);
      // Sort by highest priority (action-required3 > action-required2 > action-required)
      const getPriorityValue = (action: ReturnType<typeof getActionRequiredPriority>) => {
        if (!action) return 0;
        if (action.label === LABELS.ACTION_REQUIRED3) return 3;
        if (action.label === LABELS.ACTION_REQUIRED2) return 2;
        if (action.label === LABELS.ACTION_REQUIRED) return 1;
        return 0;
      };
      return getPriorityValue(actionB) - getPriorityValue(actionA);
    },
    cell: ({ row }) => {
      const mrLabels = row.original.mergeRequests || [];

      if (mrLabels.length === 0) return <div className="leading-none"></div>;

      return (
        <div className="leading-none space-y-1">
          {mrLabels.map(mr => {
            const excludeLabels: LabelType[] = [
              LABELS.REVIEW,
              LABELS.IN_PROGRESS,
              LABELS.CODE_REVIEW,
              LABELS.TEAM1,
              LABELS.TEAM2,
              LABELS.BUG,
            ];

            const filteredLabels = mr.labels.filter(
              label =>
                !PRIORITY_LABEL_PATTERN.test(label) && // exclude priority labels
                !excludeLabels.includes(label as LabelType) // exclude specific labels
            );

            const isReview = row.original.labels?.includes(LABELS.REVIEW);
            const hasNoLabels = filteredLabels.length === 0;
            const hasApprovedLabel = mr.labels.includes(LABELS.APPROVED);

            // Check if any MR in this issue has action-required labels
            const hasActionRequiredLabels = row.original.mergeRequests.some(mr =>
              mr.labels.some(
                label =>
                  label === LABELS.ACTION_REQUIRED ||
                  label === LABELS.ACTION_REQUIRED2 ||
                  label === LABELS.ACTION_REQUIRED3
              )
            );

            let mrNumberClass = '';

            if (hasApprovedLabel) {
              // Use a green text color for approved MRs, similar to the label's color
              mrNumberClass =
                'text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200';
            } else if (isReview && hasNoLabels && !hasActionRequiredLabels) {
              mrNumberClass =
                'text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-bold';
            } else {
              mrNumberClass =
                'text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200';
            }

            // Check if MR title starts with the issue number
            const issueNumber = row.original.iid;
            const mrTitlePrefix = mr.title ? mr.title.match(/^(\d+)/)?.[1] : null;
            const mrNumberMismatch = mrTitlePrefix && mrTitlePrefix !== issueNumber.toString();

            return (
              <div key={mr.mrIid} className="flex gap-1 items-center">
                <a
                  href={mr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={mrNumberClass}
                >
                  {mrNumberMismatch ? '?' : ''}
                  {mr.mrIid}
                </a>
                <span className="text-xs text-gray-500">:</span>
                <div className="flex gap-1 flex-wrap">
                  {filteredLabels.map((label, index) => {
                    // Check if this is a status-update-commit label
                    if (label === LABELS.STATUS_UPDATE_COMMIT) {
                      const statusInfo = getStatusUpdateCommitInfo(mr);
                      const count = statusInfo?.count || 0;
                      return (
                        <LabelPill
                          key={index}
                          // Cut the last 10 characters status-update-commit
                          text={label.slice(0, -10)}
                          colorClass={mrLabelColors[label] || 'bg-gray-200 text-gray-800'}
                          count={count >= 2 ? count : undefined}
                        />
                      );
                    }

                    // Regular labels without a counter
                    return (
                      <LabelPill
                        key={index}
                        text={label}
                        colorClass={mrLabelColors[label] || 'bg-gray-200 text-gray-800'}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    },
  },
  {
    accessorKey: 'actionRequiredTime',
    header: 'AR Time',
    enableSorting: true,
    enableResizing: true,
    size: 55,
    sortingFn: (rowA, rowB) => {
      const timeA = rowA.original.actionRequiredTime || 0;
      const timeB = rowB.original.actionRequiredTime || 0;
      return timeA - timeB;
    },
    cell: ({ row }) => {
      const actionRequiredTime = row.original.actionRequiredTime;

      if (!actionRequiredTime) return <div className="leading-none"></div>;

      // Calculate elapsed time from actionRequiredTime to now
      const elapsedTime = Date.now() - actionRequiredTime;

      let colorClass = '';

      if (elapsedTime > 24 * 60 * 60 * 1000) {
        colorClass = 'text-red-600 dark:text-red-400 font-bold';
      } else if (elapsedTime > 8 * 60 * 60 * 1000) {
        colorClass = 'text-orange-600 dark:text-orange-500';
      } else if (elapsedTime > 7 * 60 * 60 * 1000) {
        colorClass = 'text-orange-500 dark:text-orange-400';
      } else if (elapsedTime > 6 * 60 * 60 * 1000) {
        colorClass = 'text-amber-700 dark:text-amber-500';
      } else if (elapsedTime > 5 * 60 * 60 * 1000) {
        colorClass = 'text-amber-600 dark:text-amber-400';
      } else if (elapsedTime > 4 * 60 * 60 * 1000) {
        colorClass = 'text-amber-500 dark:text-amber-300';
      } else if (elapsedTime > 3 * 60 * 60 * 1000) {
        colorClass = 'text-amber-400 dark:text-amber-200';
      } else if (elapsedTime > 2 * 60 * 60 * 1000) {
        colorClass = 'text-amber-300 dark:text-amber-100';
      } else if (elapsedTime > 1 * 60 * 60 * 1000) {
        colorClass = 'text-amber-200 dark:text-amber-50';
      }

      return (
        <div className={`leading-none font-medium ${colorClass}`}>
          {formatDuration(elapsedTime)}
        </div>
      );
    },
  },
  {
    accessorKey: 'iid',
    header: 'Issue',
    enableSorting: true,
    enableResizing: true,
    size: 55,
    cell: ({ row }) => {
      return (
        <div className="leading-none flex items-center gap-2">
          <a
            href={row.original.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
          >
            {row.original.iid}
          </a>
        </div>
      );
    },
  },
  {
    accessorKey: 'team',
    header: 'Team',
    enableSorting: true,
    enableResizing: true,
    size: 55,
    cell: ({ row }) => {
      const hasTeam1 = row.original.labels?.includes(LABELS.TEAM1);
      const hasTeam2 = row.original.labels?.includes(LABELS.TEAM2);

      return (
        <div className="leading-none flex items-center gap-2">
          {hasTeam1 && (
            <LabelPill
              text="1"
              colorClass={mrLabelColors[LABELS.TEAM1] || 'bg-gray-200 text-gray-800'}
              className="shrink-0"
            />
          )}
          {hasTeam2 && (
            <LabelPill
              text="2"
              colorClass={mrLabelColors[LABELS.TEAM2] || 'bg-gray-200 text-gray-800'}
              className="shrink-0"
            />
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    enableResizing: true,
    size: 250,
    cell: ({ row }) => (
      <div
        className="leading-none truncate w-full max-w-full overflow-hidden"
        title={row.original.title}
      >
        {row.original.title}
      </div>
    ),
  },
  {
    accessorKey: 'timeInProgress',
    header: 'In Progress',
    enableSorting: true,
    enableResizing: true,
    size: 50,
    cell: ({ row }) => {
      const timeInProgress = row.original.timeInProgress;
      const hours = timeInProgress / (60 * 60 * 1000); // Convert milliseconds to hours

      let colorClass = '';
      if (hours >= 8) {
        colorClass = 'text-amber-700 dark:text-amber-500';
      } else if (hours >= 7) {
        colorClass = 'text-amber-600 dark:text-amber-400';
      } else if (hours >= 6) {
        colorClass = 'text-amber-500 dark:text-amber-300';
      } else if (hours >= 5) {
        colorClass = 'text-amber-400 dark:text-amber-200';
      }

      return (
        <div className={`leading-none ${colorClass}`}>{formatHoursAndMinutes(timeInProgress)}</div>
      );
    },
  },
  {
    accessorKey: 'totalTimeFromStart',
    header: 'Total Time',
    enableSorting: true,
    enableResizing: true,
    size: 50,
    cell: ({ row }) => (
      <div className="leading-none">{formatDuration(row.original.totalTimeFromStart)}</div>
    ),
  },
];

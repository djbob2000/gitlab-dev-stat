'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDuration, formatHoursAndMinutes } from '@/src/tasks/time-calculation.task';
import type { IssueStatistics } from '@/src/types/types';
import { LabelPill } from './label-pill';
import { priorityColors, statusColors, mrLabelColors } from './color-config';
import { getPriority, getStatusPriority, getActionRequiredPriority } from './label-utils';
import { LABELS, LabelType } from '@/src/constants/labels';

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
      const statusPriority = [LABELS.BLOCKED, LABELS.PAUSED, LABELS.REVIEW, LABELS.IN_PROGRESS, ''];
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
                !label.match(/^p[1-9]$/) && // exclude priority labels
                !excludeLabels.includes(label as LabelType) // exclude specific labels
            );

            const isReview = row.original.labels?.includes(LABELS.REVIEW);
            const hasNoLabels = filteredLabels.length === 0;
            const mrNumberClass =
              isReview && hasNoLabels
                ? 'text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-bold'
                : 'text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200';

            return (
              <div key={mr.mrIid} className="flex gap-1 items-center">
                <a
                  href={mr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={mrNumberClass}
                >
                  {mr.mrIid}
                </a>
                <span className="text-xs text-gray-500">:</span>
                <div className="flex gap-1 flex-wrap">
                  {filteredLabels.map((label, index) => (
                    <LabelPill
                      key={index}
                      text={label}
                      colorClass={mrLabelColors[label] || 'bg-gray-200 text-gray-800'}
                    />
                  ))}
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

      let colorClass = 'text-amber-600 dark:text-amber-400';

      if (elapsedTime > 24 * 60 * 60 * 1000) {
        colorClass = 'text-red-600 dark:text-red-400 font-bold';
      } else if (elapsedTime > 12 * 60 * 60 * 1000) {
        colorClass = 'text-orange-600 dark:text-orange-400';
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
    cell: ({ row }) => (
      <div className="leading-none">{formatHoursAndMinutes(row.original.timeInProgress)}</div>
    ),
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

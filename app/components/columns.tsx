'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDuration } from '@/src/tasks/time-calculation.task';
import type { DeveloperStatistics } from '@/lib/types';

export const columns: ColumnDef<DeveloperStatistics>[] = [
  {
    accessorKey: 'username',
    header: 'Developer',
  },
  {
    accessorKey: 'issuesCount',
    header: 'Total Issues',
  },
  {
    accessorKey: 'avgTimePerIssue',
    header: 'Average Time',
    cell: ({ row }) => formatDuration(row.getValue('avgTimePerIssue')),
  },
  {
    accessorKey: 'totalTimeInProgress',
    header: 'Total Time',
    cell: ({ row }) => formatDuration(row.getValue('totalTimeInProgress')),
  },
]; 
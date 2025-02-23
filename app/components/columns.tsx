'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDuration } from '@/src/tasks/time-calculation.task';
import type { IssueStatistics } from '@/lib/types';

const priorityColors: Record<string, string> = {
  p1: 'bg-[#db3b21] text-white',
  p2: 'bg-[#cc338b] text-white',
  p3: 'bg-[#fc9403] text-black',
  p4: 'bg-[#f4c404] text-black',
  p5: 'bg-[#1f7e23] text-white',
  p6: 'bg-[#2da160] text-white',
  p7: 'bg-[#2da160] text-white',
  p8: 'bg-[#aaaaaa] text-black',
};

const statusColors: Record<string, string> = {
  'blocked': 'bg-[#666666] text-white',
  'in-progress': 'bg-[#1f7e23] text-white',
  'paused': 'bg-[#fc9403] text-black',
  'review': 'bg-[#0d0d0d] text-white',
};

const LabelPill = ({ text, colorClass }: { text: string, colorClass: string }) => (
  <span className={`inline-flex items-center px-2 rounded-full text-xs font-medium ${colorClass}`}>
    {text}
  </span>
);

export const columns: ColumnDef<IssueStatistics>[] = [
  {
    accessorKey: 'username',
    header: 'Developer',
    enableSorting: true,
    enableResizing: true,
    minSize: 100,
  },
  {
    accessorKey: 'labels',
    header: 'Priority',
    enableSorting: true,
    enableResizing: true,
    minSize: 80,
    sortingFn: (rowA, rowB) => {
      const getPriority = (labels: string[]) => {
        const priorityLabel = labels?.find(label => /^p[1-8]$/.test(label));
        return priorityLabel ? parseInt(priorityLabel.substring(1)) : 9;
      };
      return getPriority(rowA.original.labels) - getPriority(rowB.original.labels);
    },
    cell: ({ row }) => {
      const priorityLabel = row.original.labels?.find(label => /^p[1-8]$/.test(label));
      if (!priorityLabel) return <div className="leading-none">-</div>;
      
      return (
        <div className="leading-none">
          <LabelPill 
            text={priorityLabel} 
            colorClass={priorityColors[priorityLabel] || 'bg-gray-200 text-gray-800'} 
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
    minSize: 100,
    sortingFn: (rowA, rowB) => {
      const getStatusPriority = (labels: string[]) => {
        if (labels?.includes('blocked')) return 4;
        if (labels?.includes('paused')) return 3;
        if (labels?.includes('review')) return 2;
        if (labels?.includes('in-progress')) return 1;
        return 5;
      };
      return getStatusPriority(rowA.original.labels) - getStatusPriority(rowB.original.labels);
    },
    cell: ({ row }) => {
      const labels = row.original.labels;
      const statusLabel = labels?.find(label => ['in-progress', 'paused', 'blocked', 'review'].includes(label));
      
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
    accessorKey: 'iid',
    header: 'Issue',
    enableSorting: true,
    enableResizing: true,
    minSize: 80,
    cell: ({ row }) => (
      <div className="leading-none">
        <a
          href={row.original.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          {row.original.iid}
        </a>
      </div>
    ),
  },
  {
    accessorKey: 'timeInProgress',
    header: 'In Progress',
    enableSorting: true,
    enableResizing: true,
    minSize: 100,
    cell: ({ row }) => (
      <div className="leading-none">
        {formatDuration(row.original.timeInProgress)}
      </div>
    ),
  },
  {
    accessorKey: 'totalTimeFromStart',
    header: 'Total Time',
    enableSorting: true,
    enableResizing: true,
    minSize: 100,
    cell: ({ row }) => (
      <div className="leading-none">
        {formatDuration(row.original.totalTimeFromStart)}
      </div>
    ),
  },
]; 
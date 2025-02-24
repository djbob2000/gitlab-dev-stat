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

const mrLabelColors: Record<string, string> = {
  'action-required': 'bg-[#dbc8a0] text-black',    // бежевый
  'action-required2': 'bg-[#4f97d3] text-black',   // зеленый
  'action-required3': 'bg-[#4b28b6] text-white',   // темно-фиолетовый
  'approved': 'bg-[#69d36e] text-black',          // зеленый
  'blocked': 'bg-[#666666] text-white',           // серый
  'bug': 'bg-[#cc5842] text-white',              // красно-коричневый
  'cluster': 'bg-[#4f97d3] text-white',          // голубой
  'code-review': 'bg-[#4f97d3] text-white',      // голубой
  'comment': 'bg-[#666666] text-white',          // серый
  'discuss': 'bg-[#666666] text-white',          // серый
  'feedback': 'bg-[#cc5842] text-white',         // красно-коричневый
  'in-progress': 'bg-[#69d36e] text-white',      // зеленый
  'maintenance': 'bg-[#b5326e] text-white',      // темно-розовый
  'not-ready': 'bg-[#666666] text-white',        // серый
  'paused': 'bg-[#ebc21b] text-black',          // желтый
  'qa-pre-check': 'bg-[#ebc21b] text-black',    // желтый
  'review': 'bg-[#344759] text-white',          // темно-синий
  'status-update-commit': 'bg-[#dbc8a0] text-black', // бежевый
  'team1': 'bg-[#cccccc] text-black',           // светло-серый
  'team2': 'bg-[#8e5bb5] text-white',           // фиолетовый
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
    minSize: 80,
  },
  {
    accessorKey: 'labels',
    header: 'Prio',
    enableSorting: true,
    enableResizing: true,
    minSize: 20,
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
    minSize: 80,
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
    accessorKey: 'mergeRequestLabels',
    header: 'MR Labels',
    enableSorting: true,
    enableResizing: true,
    minSize: 120,
    cell: ({ row }) => {
      const mrLabels = row.original.mergeRequestLabels || [];
      
      if (mrLabels.length === 0) return <div className="leading-none">-</div>;
      
      return (
        <div className="leading-none space-y-1">
          {mrLabels.map((mr) => {
            const filteredLabels = mr.labels.filter(label => 
              !label.match(/^p[1-8]$/) && // исключаем priority метки
              !['review', 'in-progress', 'code-review', 'team1', 'team2'].includes(label) // исключаем специфичные метки
            );

            if (filteredLabels.length === 0) return null;

            return (
              <div key={mr.mrIid} className="flex gap-1 items-center">
                <a
                  href={mr.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
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
    accessorKey: 'title',
    header: 'Title',
    enableSorting: true,
    enableResizing: true,
    minSize: 200,
    cell: ({ row }) => (
      <div className="leading-none truncate max-w-md" title={row.original.title}>
        {row.original.title}
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
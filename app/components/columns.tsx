'use client';

import { ColumnDef } from '@tanstack/react-table';
import { formatDuration, formatHoursAndMinutes } from '@/src/tasks/time-calculation.task';
import type { IssueStatistics, MergeRequestLabels } from '@/lib/types';
import { cn } from '@/lib/utils';

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

const LabelPill = ({ text, colorClass, className }: { text: string, colorClass: string, className?: string }) => (
  <span className={cn(`inline-flex items-center px-2 rounded-full text-xs font-medium ${colorClass}`, className)}>
    {text}
  </span>
);

export const columns: ColumnDef<IssueStatistics>[] = [
  {
    accessorKey: 'username',
    header: 'Developer',
    enableSorting: true,
    enableResizing: true,
    minSize: 20,
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
    minSize: 20,
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
    minSize: 80,
    sortingFn: (rowA, rowB) => {
      // Get the highest priority action-required label for each row
      const getActionRequiredPriority = (mrLabels: MergeRequestLabels[] = []) => {
        let highestPriority = 4; // Default priority (lower than any action-required)
        
        for (const mr of mrLabels) {
          const actionRequiredLabels = mr.labels.filter((label: string) => 
            label === 'action-required' || 
            label === 'action-required2' || 
            label === 'action-required3'
          );
          
          for (const label of actionRequiredLabels) {
            let priority = 4; // Default
            if (label === 'action-required') priority = 1;
            else if (label === 'action-required2') priority = 2;
            else if (label === 'action-required3') priority = 3;
            
            if (priority < highestPriority) {
              highestPriority = priority;
            }
          }
        }
        
        return highestPriority;
      };
      
      return getActionRequiredPriority(rowA.original.mergeRequestLabels) - 
             getActionRequiredPriority(rowB.original.mergeRequestLabels);
    },
    cell: ({ row }) => {
      const mrLabels = row.original.mergeRequestLabels || [];
      
      if (mrLabels.length === 0) return <div className="leading-none">-</div>;
      
      return (
        <div className="leading-none space-y-1">
          {mrLabels.map((mr) => {
            const filteredLabels = mr.labels.filter(label => 
              !label.match(/^p[1-8]$/) && // исключаем priority метки
              !['review', 'in-progress', 'code-review', 'team1', 'team2', 'bug'].includes(label) // исключаем специфичные метки
            );

            const isReview = row.original.labels?.includes('review');
            const hasNoLabels = filteredLabels.length === 0;
            const mrNumberClass = isReview && hasNoLabels 
              ? "text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-bold"
              : "text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200";

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
    minSize: 20,
    sortingFn: (rowA, rowB) => {
      const timeA = rowA.original.actionRequiredTime || 0;
      const timeB = rowB.original.actionRequiredTime || 0;
      return timeA - timeB;
    },
    cell: ({ row }) => {
      const actionRequiredTime = row.original.actionRequiredTime;
      
      if (!actionRequiredTime) return <div className="leading-none"></div>;
      
      // Calculate elapsed time from actionRequiredTime to now
      // This will be recalculated on every render, which happens when actionRequiredUpdateTime changes
      const elapsedTime = Date.now() - actionRequiredTime;
      
      // Определяем цвет в зависимости от прошедшего времени
      // Более 24 часов - красный, более 12 часов - оранжевый, иначе - желтый
      let colorClass = 'text-amber-600 dark:text-amber-400'; // По умолчанию желтый
      
      if (elapsedTime > 24 * 60 * 60 * 1000) { // Более 24 часов
        colorClass = 'text-red-600 dark:text-red-400 font-bold';
      } else if (elapsedTime > 12 * 60 * 60 * 1000) { // Более 12 часов
        colorClass = 'text-orange-600 dark:text-orange-400';
      }
      
      // Format the elapsed time
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
    minSize: 20,
    cell: ({ row }) => {
      const hasTeam1 = row.original.labels?.includes('team1');
      
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
          {hasTeam1 && (
            <LabelPill 
              text="team1" 
              colorClass={mrLabelColors['team1'] || 'bg-gray-200 text-gray-800'} 
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
    minSize: 20,
    cell: ({ row }) => (
      <div className="leading-none">
        {formatHoursAndMinutes(row.original.timeInProgress)}
      </div>
    ),
  },
  {
    accessorKey: 'totalTimeFromStart',
    header: 'Total Time',
    enableSorting: true,
    enableResizing: true,
    minSize: 20,
    cell: ({ row }) => (
      <div className="leading-none">
        {formatDuration(row.original.totalTimeFromStart)}
      </div>
    ),
  },
]; 
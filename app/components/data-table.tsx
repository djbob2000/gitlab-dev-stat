'use client';

import * as React from 'react';
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnResizeMode,
  ColumnSizingState,
  Updater,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  error?: string | null;
  onRefresh?: () => void;
  lastUpdated?: Date;
  actionRequiredUpdateTime?: Date;
  isLoading?: boolean;
  autoRefresh?: boolean;
  onAutoRefreshChange?: (value: boolean) => void;
  nextRefreshTime?: Date | null;
  tableId?: string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  error,
  onRefresh,
  lastUpdated,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  actionRequiredUpdateTime,
  isLoading = false,
  autoRefresh = false,
  onAutoRefreshChange,
  nextRefreshTime,
  tableId = 'developer-stats',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'username', desc: false }
  ]);
  const [columnResizeMode] = React.useState<ColumnResizeMode>('onChange');
  const [timeRemaining, setTimeRemaining] = React.useState<string>('5:00');
  
  // State for column sizing
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  
  // Load saved column widths on mount
  React.useEffect(() => {
    try {
      const savedWidths = localStorage.getItem(`table-column-widths-${tableId}`);
      if (savedWidths) {
        setColumnSizing(JSON.parse(savedWidths));
      }
    } catch (error) {
      console.error('Failed to load column widths from localStorage:', error);
    }
  }, [tableId]);
  
  // Save column widths when they change
  const handleColumnSizingChange = React.useCallback(
    (updaterOrValue: Updater<ColumnSizingState>) => {
      // Handle both function updater and direct value
      const newSizing = typeof updaterOrValue === 'function' 
        ? updaterOrValue(columnSizing as ColumnSizingState) 
        : updaterOrValue;
      
      setColumnSizing(newSizing);
      try {
        localStorage.setItem(`table-column-widths-${tableId}`, JSON.stringify(newSizing));
      } catch (error) {
        console.error('Failed to save column widths to localStorage:', error);
      }
    },
    [tableId, columnSizing]
  );

  const formatLastUpdated = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Update countdown timer
  React.useEffect(() => {
    if (!autoRefresh || !nextRefreshTime) {
      setTimeRemaining('5:00');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = Math.max(0, nextRefreshTime.getTime() - now.getTime());
      
      if (diff <= 0) {
        setTimeRemaining('0:00');
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately and then every second
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, nextRefreshTime]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    state: {
      sorting,
      columnSizing,
    },
    onColumnSizingChange: handleColumnSizingChange,
    columnResizeDirection: 'ltr',
  });

  // Track the current developer to apply alternating backgrounds
  let currentDeveloper = '';
  let developerGroup = 0;

  return (
    <div className="rounded-lg shadow-md bg-white dark:bg-gray-800">
      <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Developer Statistics</h2>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Last updated: {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="flex items-center gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={cn(
                "h-4 w-4",
                isLoading && "animate-spin"
              )} />
              Refresh Data
            </Button>
            <div className="flex items-center gap-2 min-w-26">
              <Checkbox 
                id="auto-refresh" 
                checked={autoRefresh} 
                onCheckedChange={onAutoRefreshChange}
                disabled={isLoading}
              />
              <Label 
                htmlFor="auto-refresh" 
                className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Auto {autoRefresh && `(${timeRemaining})`}
              </Label>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ minWidth: table.getTotalSize() }}>
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'cursor-pointer select-none' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        <span className="ml-2">
                          {{
                            asc: '↑',
                            desc: '↓',
                          }[header.column.getIsSorted() as string] ?? null}
                        </span>
                      </div>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-gray-300 dark:bg-gray-600
                          ${header.column.getIsResizing() ? 'bg-blue-500 dark:bg-blue-400' : ''}`}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                // Check if developer changed
                const rowData = row.original as { username: string };
                if (currentDeveloper !== rowData.username) {
                  currentDeveloper = rowData.username;
                  developerGroup++;
                }
                
                return (
                  <tr 
                    key={row.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      developerGroup % 2 === 0 
                        ? 'bg-gray-50 dark:bg-gray-800' 
                        : 'bg-white dark:bg-gray-900'
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-sm text-center text-gray-500 dark:text-gray-400"
                >
                  {error || 'No results.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
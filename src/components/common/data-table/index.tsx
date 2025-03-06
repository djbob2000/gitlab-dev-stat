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
} from '@tanstack/react-table';
import { TableHeader } from './table-header';
import { useColumnSizing } from './use-column-sizing';
import { useCountdownTimer } from './use-countdown-timer';

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
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'username', desc: false }]);
  const [columnResizeMode] = React.useState<ColumnResizeMode>('onChange');

  // Use custom hooks
  const { columnSizing, handleColumnSizingChange } = useColumnSizing(tableId);
  const timeRemaining = useCountdownTimer(autoRefresh, nextRefreshTime || null);

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
      <TableHeader
        title="Developer Statistics"
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        timeRemaining={timeRemaining}
        onRefresh={onRefresh}
        onAutoRefreshChange={onAutoRefreshChange}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-3 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 rounded m-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <table
          className="w-full divide-y divide-gray-200 dark:divide-gray-700"
          style={{ minWidth: table.getTotalSize() }}
        >
          <thead className="bg-gray-50 dark:bg-gray-900">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
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
                        {flexRender(header.column.columnDef.header, header.getContext())}
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
              table.getRowModel().rows.map(row => {
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
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {isLoading ? 'Loading...' : 'No results found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

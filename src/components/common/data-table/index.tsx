'use client';

// Import components from dnd-kit
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { arrayMove, horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import {
  type ColumnDef,
  type ColumnResizeMode,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { GripVertical } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { SkeletonTableRows } from './skeleton-table-rows';
import { SortableHeader } from './sortable-header';
import { TableHeader } from './table-header';
import { useColumnOrder } from './use-column-order';
import { useColumnSizing } from './use-column-sizing';

// Version with column resizing and dragging
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  error?: string | null;
  lastUpdated?: Date;
  isLoading?: boolean;
  tableId?: string;
  projectName?: string;
  dragHandle?: React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  error,
  lastUpdated,
  isLoading = false,
  tableId = 'developer-stats',
  projectName,
  dragHandle,
}: DataTableProps<TData, TValue>) {
  // States for sorting and resizing
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'username', desc: false }]);
  const [columnResizeMode] = React.useState<ColumnResizeMode>('onChange');
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const normalizedColumns = columns.map((column, index) => {
    if (!column.id) {
      if ('accessorKey' in column && typeof column.accessorKey === 'string') {
        column.id = column.accessorKey;
      } else if (column.header && typeof column.header === 'string') {
        column.id = column.header.toLowerCase().replace(/\s+/g, '_');
      } else {
        column.id = `column_${index}`;
      }
    }
    return column;
  });

  const columnIds = normalizedColumns.map(column => String(column.id));

  // Use hooks for state management
  const { columnSizing, handleColumnSizingChange } = useColumnSizing(tableId);
  const { columnOrder, handleColumnOrderChange } = useColumnOrder(tableId, columnIds);

  // Setup sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // Setup table with support for resizing and reordering columns
  const table = useReactTable({
    data,
    columns: normalizedColumns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    columnResizeMode,
    enableColumnResizing: true,
    enableMultiSort: true,
    state: {
      sorting,
      columnSizing,
      columnOrder,
    },
    onColumnSizingChange: handleColumnSizingChange,
    onColumnOrderChange: handleColumnOrderChange,
    columnResizeDirection: 'ltr',
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  // Handler for drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Convert IDs to strings for consistency
      const activeId = String(active.id);
      const overId = String(over.id);

      // Find column indexes
      const oldIndex = columnOrder.indexOf(activeId);
      const newIndex = columnOrder.indexOf(overId);

      if (oldIndex >= 0 && newIndex >= 0) {
        // Update column order
        const newOrder = arrayMove(columnOrder, oldIndex, newIndex);
        handleColumnOrderChange(newOrder);
      }
    }

    setActiveId(null);
  };

  const getColumnHeaderLabel = (id: string) => {
    const column = table.getAllColumns().find(col => String(col.id) === id);
    if (column?.columnDef.header) {
      return typeof column.columnDef.header === 'string' ? column.columnDef.header : id;
    }
    return id;
  };

  const skeletonRowCount = 6;

  return (
    <div className="rounded-lg shadow-md bg-white dark:bg-gray-800">
      <TableHeader
        title={projectName || 'Developer Statistics'}
        lastUpdated={lastUpdated}
        action={dragHandle}
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-3 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 rounded m-2">
          {error}
        </div>
      )}

      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table
            className="w-full divide-y divide-gray-200 dark:divide-gray-700"
            style={{ minWidth: table.getTotalSize() }}
          >
            <thead className="bg-gray-50 dark:bg-gray-900">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  <SortableContext
                    items={headerGroup.headers.map(header => String(header.column.id))}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map(header => (
                      <SortableHeader<TData> key={header.id} header={header} _table={table} />
                    ))}
                  </SortableContext>
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {isLoading ? (
                <SkeletonTableRows<TData> table={table} rows={skeletonRowCount} />
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => {
                  const isEvenRow = Number.parseInt(row.id, 10) % 2 === 0;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        'hover:bg-gray-50 dark:hover:bg-gray-700',
                        isEvenRow ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
                      )}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className="px-2 py-0.5 text-sm text-gray-500 dark:text-gray-400 overflow-hidden"
                          style={{
                            width: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                          }}
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
                    No results found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Add DragOverlay for visual feedback when dragging */}
          <DragOverlay>
            {activeId ? (
              <div className="px-3 py-2 bg-white dark:bg-gray-800 shadow-lg rounded border border-blue-500 text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <GripVertical className="h-4 w-4 text-blue-500 mr-2" />
                {getColumnHeaderLabel(activeId)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

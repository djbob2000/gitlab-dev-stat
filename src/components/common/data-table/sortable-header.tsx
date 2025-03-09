'use client';

import * as React from 'react';
import { flexRender, Header, Table } from '@tanstack/react-table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableHeaderProps<TData, TValue> {
  header: Header<TData, TValue>;
  table: Table<TData>;
}

export function SortableHeader<TData, TValue>({
  header,
  table,
}: SortableHeaderProps<TData, TValue>) {
  // Get column ID
  const columnId = React.useMemo(() => {
    return String(header.column.id);
  }, [header.column.id]);

  // Use useSortable for drag-and-drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId,
  });

  // Memoize sort handler to prevent unnecessary rerenders
  const toggleSortingHandler = React.useMemo(() => {
    return header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined;
  }, [header.column]);

  // Memoize resize handler
  const resizeHandler = React.useMemo(() => {
    return header.column.getCanResize() ? header.getResizeHandler() : undefined;
  }, [header]);

  // Memoize sort icon
  const sortingIcon = React.useMemo(() => {
    const sortDirection = header.column.getIsSorted();
    if (!sortDirection) return null;

    return <span className="ml-2">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  }, [header.column.getIsSorted()]);

  // Styles for dragging
  const style = React.useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      position: 'relative' as const,
      width: header.getSize(),
      zIndex: isDragging ? 999 : 'auto',
      backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : undefined,
    }),
    [transform, transition, isDragging, header.getSize()]
  );

  // Memoize classes for th
  const thClassName = React.useMemo(() => {
    return `px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative ${
      isDragging ? 'ring-2 ring-blue-500 dark:ring-blue-400 rounded shadow-md' : ''
    }`;
  }, [isDragging]);

  // Memoize header content
  const headerContent = React.useMemo(() => {
    if (header.isPlaceholder) return null;

    return flexRender(header.column.columnDef.header, header.getContext());
  }, [header.isPlaceholder, header.column.columnDef.header, header.getContext()]);

  return (
    <th ref={setNodeRef} style={style} className={thClassName} {...attributes}>
      <div className="flex items-center">
        {/* Drag handle - remove bg-gray-100 dark:bg-gray-700, keep hover */}
        <span
          className="mr-1 cursor-grab touch-none rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-gray-500" />
        </span>

        {/* Column header content */}
        {!header.isPlaceholder && (
          <span
            className={header.column.getCanSort() ? 'cursor-pointer select-none flex-1' : 'flex-1'}
            onClick={toggleSortingHandler}
          >
            {headerContent}
            {sortingIcon}
          </span>
        )}

        {/* Column resize handle */}
        {header.column.getCanResize() && (
          <span
            onMouseDown={resizeHandler}
            onTouchStart={resizeHandler}
            className={`absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-gray-300 dark:bg-gray-600
              ${header.column.getIsResizing() ? 'bg-blue-500 dark:bg-blue-400' : ''}`}
          />
        )}
      </div>
    </th>
  );
}

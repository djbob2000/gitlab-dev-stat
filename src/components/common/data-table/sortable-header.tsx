'use client';

import * as React from 'react';
import { flexRender, Header, Table } from '@tanstack/react-table';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface SortableHeaderProps<TData> {
  header: Header<TData, unknown>;
  _table: Table<TData>;
}

export function SortableHeader<TData>({ header, _table }: SortableHeaderProps<TData>) {
  // Get column ID
  const columnId = React.useMemo(() => {
    return String(header.column.id);
  }, [header.column.id]);

  // Use useSortable for drag-and-drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId,
  });

  // Memoize sort handler to prevent unnecessary rerenders
  const canSort = header.column.getCanSort();
  const toggleSortingHandler = React.useMemo(() => {
    return canSort ? header.column.getToggleSortingHandler() : undefined;
  }, [canSort, header.column]);

  // Memoize resize handler
  const canResize = header.column.getCanResize();
  const resizeHandler = React.useMemo(() => {
    return canResize ? header.getResizeHandler() : undefined;
  }, [canResize, header]);

  // Memoize sort icon
  const isSorted = header.column.getIsSorted();
  const sortingIcon = React.useMemo(() => {
    if (!isSorted) return null;

    return <span className="ml-2">{isSorted === 'asc' ? '↑' : '↓'}</span>;
  }, [isSorted]);

  // Styles for dragging
  const headerSize = header.getSize();
  const style = React.useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.6 : 1,
      position: 'relative' as const,
      width: headerSize,
      zIndex: isDragging ? 999 : 'auto',
      backgroundColor: isDragging ? 'rgba(59, 130, 246, 0.1)' : undefined,
    }),
    [transform, transition, isDragging, headerSize]
  );

  // Memoize classes for th
  const thClassName = React.useMemo(() => {
    return `px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider relative ${
      isDragging ? 'ring-2 ring-blue-500 dark:ring-blue-400 rounded shadow-md' : ''
    }`;
  }, [isDragging]);

  // Memoize header content
  const isPlaceholder = header.isPlaceholder;
  const columnDef = header.column.columnDef.header;
  const headerContext = header.getContext();
  const headerContent = React.useMemo(() => {
    if (isPlaceholder) return null;

    return flexRender(columnDef, headerContext);
  }, [isPlaceholder, columnDef, headerContext]);

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
        {!isPlaceholder && (
          <span
            className={canSort ? 'cursor-pointer select-none flex-1' : 'flex-1'}
            onClick={toggleSortingHandler}
          >
            {headerContent}
            {sortingIcon}
          </span>
        )}

        {/* Column resize handle */}
        {canResize && (
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

'use client';
import type { useReactTable } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SkeletonTableRows<TData>({
  table,
  rows = 1,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  rows?: number;
}) {
  const rowIds = Array.from({ length: rows }, (_, index) => `skeleton-row-${index + 1}`);

  return (
    <>
      {rowIds.map((rowId, rowIndex) => (
        <tr
          key={rowId}
          className={cn(
            rowIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
          )}
        >
          {table.getVisibleLeafColumns().map((col) => (
            <td key={`sk-${String(col.id)}-${rowId}`} className="px-2 py-2">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

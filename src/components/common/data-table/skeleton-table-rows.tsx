'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useReactTable } from '@tanstack/react-table';

export function SkeletonTableRows<TData>({
  table,
  rows = 6,
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  rows?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr
          key={`skeleton-${i}`}
          className={cn(i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900')}
        >
          {table.getVisibleLeafColumns().map(col => (
            <td key={`sk-${String(col.id)}-${i}`} className="px-2 py-2">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

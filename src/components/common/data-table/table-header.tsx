'use client';

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Label } from '@/src/components/ui/label';
import { cn } from '@/src/lib/utils';
import { formatLastUpdated } from './date-formatter';

interface TableHeaderProps {
  title: string;
  lastUpdated?: Date;
  isLoading: boolean;
  autoRefresh: boolean;
  timeRemaining: string;
  onRefresh?: () => void;
  onAutoRefreshChange?: (value: boolean) => void;
}

export function TableHeader({
  title,
  lastUpdated,
  isLoading,
  autoRefresh,
  timeRemaining,
  onRefresh,
  onAutoRefreshChange,
}: TableHeaderProps) {
  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
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
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
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
  );
}

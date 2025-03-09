'use client';

import React from 'react';
import { Button } from '@/src/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// Maximally simplified version
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
  // Memoize auto-refresh toggle handler
  const handleToggleAutoRefresh = React.useCallback(() => {
    if (onAutoRefreshChange) {
      onAutoRefreshChange(!autoRefresh);
    }
  }, [autoRefresh, onAutoRefreshChange]);

  // Memoize formatted date
  const formattedDate = React.useMemo(() => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleString();
  }, [lastUpdated]);

  // Memoize classes for refresh icon
  const refreshIconClasses = React.useMemo(() => {
    return cn('h-4 w-4', isLoading && 'animate-spin');
  }, [isLoading]);

  // Memoize auto-refresh button variant
  const autoRefreshButtonVariant = React.useMemo(() => {
    return autoRefresh ? 'default' : 'outline';
  }, [autoRefresh]);

  return (
    <div className="flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="flex items-center gap-4">
        {lastUpdated && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Last updated: {formattedDate}
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
            <RefreshCw className={refreshIconClasses} />
            Refresh Data
          </Button>

          <Button
            variant={autoRefreshButtonVariant}
            size="sm"
            onClick={handleToggleAutoRefresh}
            disabled={isLoading}
            className="min-w-[110px]"
          >
            {autoRefresh ? (
              <>
                Auto On (<span className="font-mono">{timeRemaining}</span>)
              </>
            ) : (
              'Auto Off'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

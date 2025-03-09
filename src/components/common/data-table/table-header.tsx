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

  // State to track current time for updating "time ago" display
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Effect to update current time every minute
  React.useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute (60000ms)

    return () => clearInterval(intervalId);
  }, []);

  // Memoize formatted date and time ago
  const { formattedTime, timeAgo } = React.useMemo(() => {
    if (!lastUpdated) return { formattedTime: '', timeAgo: '' };

    // Format time as hh:mm
    const hours = lastUpdated.getHours().toString().padStart(2, '0');
    const minutes = lastUpdated.getMinutes().toString().padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    // Calculate time difference in a way that works across day boundaries
    const diffMs = currentTime.getTime() - lastUpdated.getTime();

    // Ensure we're dealing with a positive time difference
    // If somehow the lastUpdated is in the future, show 00:00 ago
    if (diffMs < 0) {
      return { formattedTime, timeAgo: '00:00 ago' };
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;

    // Format with padded zeros
    const formattedHours = String(diffHours).padStart(2, '0');
    const formattedMinutes = String(remainingMinutes).padStart(2, '0');

    const timeAgo = `${formattedHours}:${formattedMinutes} ago`;

    return { formattedTime, timeAgo };
  }, [lastUpdated, currentTime]);

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
            Last updated: {formattedTime} ({timeAgo})
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

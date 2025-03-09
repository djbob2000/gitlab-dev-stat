import { useState, useEffect, useRef } from 'react';

/**
 * Hook for countdown timer with minimal setState usage
 */
export function useCountdownTimer(autoRefresh: boolean, nextRefreshTime: Date | null): string {
  // Use a single state to avoid multiple updates
  const [formattedTime, setFormattedTime] = useState<string>('5:00');

  // Store previous values in ref to track changes
  const previousValuesRef = useRef({ autoRefresh, nextRefreshTimeMs: nextRefreshTime?.getTime() });

  // Store interval in ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start/stop timer
  useEffect(() => {
    // Clear previous interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If auto-refresh is disabled or no date, just show 5:00
    if (!autoRefresh || !nextRefreshTime) {
      setFormattedTime('5:00');
      return;
    }

    // Check date validity
    const isValidDate = nextRefreshTime instanceof Date && !isNaN(nextRefreshTime.getTime());
    if (!isValidDate) {
      setFormattedTime('5:00');
      return;
    }

    // Initial time update
    const updateTimer = () => {
      const now = new Date();
      const diff = Math.max(0, nextRefreshTime.getTime() - now.getTime());

      // Format time
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const newTime = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Update only if value has changed
      setFormattedTime(previousTime => {
        if (previousTime !== newTime) {
          return newTime;
        }
        return previousTime;
      });
    };

    // Start interval only when important parameters change
    const hasChanged =
      autoRefresh !== previousValuesRef.current.autoRefresh ||
      nextRefreshTime.getTime() !== previousValuesRef.current.nextRefreshTimeMs;

    if (hasChanged) {
      // Remember new values
      previousValuesRef.current = {
        autoRefresh,
        nextRefreshTimeMs: nextRefreshTime.getTime(),
      };

      // Update timer immediately
      updateTimer();

      // Set new interval
      intervalRef.current = setInterval(updateTimer, 1000);
    }

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, nextRefreshTime]);

  // Return formatted time
  return formattedTime;
}

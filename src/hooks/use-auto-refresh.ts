import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook for handling auto-refresh functionality
 */
export function useAutoRefresh(onRefresh: () => Promise<void>, isLoading: boolean) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle auto-refresh state change
  const handleAutoRefreshChange = useCallback(
    (enabled: boolean) => {
      if (enabled === autoRefresh) return;

      setAutoRefresh(enabled);

      if (enabled) {
        // Set next refresh time
        const nextRefresh = new Date(Date.now() + 5 * 60 * 1000);
        setNextAutoRefresh(nextRefresh);
      } else {
        // Clear timer and refresh time
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        setNextAutoRefresh(null);
      }
    },
    [autoRefresh]
  );

  // Function to schedule next refresh
  const scheduleNextRefresh = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!autoRefresh) return;

    // Set next refresh time if not set
    if (!nextAutoRefresh) {
      const nextRefresh = new Date(Date.now() + 5 * 60 * 1000);
      setNextAutoRefresh(nextRefresh);
    }

    // Calculate time until refresh
    const timeUntilRefresh = nextAutoRefresh
      ? nextAutoRefresh.getTime() - Date.now()
      : 5 * 60 * 1000;

    // If time is up, refresh now
    if (timeUntilRefresh <= 1000) {
      if (autoRefresh && !isLoading) {
        onRefresh().finally(() => {
          setNextAutoRefresh(null);
          if (autoRefresh) {
            scheduleNextRefresh();
          }
        });
      }
      return;
    }

    // Set timer
    timerRef.current = setTimeout(() => {
      timerRef.current = null;

      if (autoRefresh && !isLoading) {
        onRefresh().finally(() => {
          setNextAutoRefresh(null);
          if (autoRefresh) {
            scheduleNextRefresh();
          }
        });
      }
    }, timeUntilRefresh);
  }, [autoRefresh, nextAutoRefresh, isLoading, onRefresh]);

  // Handle auto-refresh effect
  useEffect(() => {
    if (autoRefresh && !timerRef.current && !isLoading) {
      scheduleNextRefresh();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoRefresh, scheduleNextRefresh, isLoading]);

  return { autoRefresh, nextAutoRefresh, handleAutoRefreshChange };
}

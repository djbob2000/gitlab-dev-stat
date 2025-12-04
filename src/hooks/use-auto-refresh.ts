import { useEffect, useEffectEvent, useRef, useState } from 'react';

const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

/**
 * Custom hook for handling auto-refresh functionality with 5-minute intervals
 * Uses React 19.3+ useEffectEvent hook
 */
export function useAutoRefresh(onRefresh: () => Promise<void>, isLoading: boolean) {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle auto-refresh state
  const handleAutoRefreshChange = (enabled: boolean) => {
    setAutoRefresh(enabled);
  };

  // Stable refresh handler using useEffectEvent to prevent unnecessary timer restarts
  const handleRefresh = useEffectEvent(async () => {
    // Only refresh if not already loading
    if (!isLoading) {
      try {
        await onRefresh();
      } finally {
        // Set next refresh time after current refresh completes
        setNextAutoRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));
      }
    } else {
      // If we're loading, just update the next refresh time
      setNextAutoRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));
    }
  });

  // Main effect handling the auto-refresh logic
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // If auto-refresh is disabled, clear next refresh time and return
    if (!autoRefresh) {
      setNextAutoRefresh(null);
      return;
    }

    // Set initial next refresh time if not already set
    if (!nextAutoRefresh) {
      setNextAutoRefresh(new Date(Date.now() + AUTO_REFRESH_INTERVAL));
    }

    // Schedule refresh
    const timeUntilRefresh = nextAutoRefresh
      ? Math.max(nextAutoRefresh.getTime() - Date.now(), 0)
      : AUTO_REFRESH_INTERVAL;

    timerRef.current = setTimeout(() => {
      // Use the refresh handler
      handleRefresh();
    }, timeUntilRefresh);

    // Clean up on unmount or when dependencies change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoRefresh, nextAutoRefresh]);

  return { autoRefresh, nextAutoRefresh, handleAutoRefreshChange };
}

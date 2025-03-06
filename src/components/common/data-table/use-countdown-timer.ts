import { useState, useEffect } from 'react';

/**
 * Hook for managing a countdown timer for auto-refresh
 */
export const useCountdownTimer = (autoRefresh: boolean, nextRefreshTime: Date | null) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('5:00');

  // Update countdown timer
  useEffect(() => {
    if (!autoRefresh || !nextRefreshTime) {
      setTimeRemaining('5:00');
      return;
    }

    const updateCountdown = () => {
      const now = new Date();
      const diff = Math.max(0, nextRefreshTime.getTime() - now.getTime());

      if (diff <= 0) {
        setTimeRemaining('0:00');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    // Update immediately and then every second
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, nextRefreshTime]);

  return timeRemaining;
};

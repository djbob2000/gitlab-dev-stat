'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/src/components/common/data-table';
import { columns } from '@/src/components/common/columns';
import type { IssueStatistics } from '@/src/types/types';
import { ThemeToggle } from '@/src/components/common/theme-toggle';
import { Settings } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';
import { useTrackedDevelopers } from '@/src/hooks/use-tracked-developers';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Progress } from '@/src/components/ui/progress';
import { fetchWithToken } from '@/src/lib/api';
import { toast } from 'sonner';

async function fetchAnalytics(
  developers: { userId: number; username: string }[]
): Promise<IssueStatistics[]> {
  if (developers.length === 0) {
    return [];
  }

  const params = new URLSearchParams();

  // Prefer user IDs over usernames for better reliability
  const userIds = developers.map(dev => dev.userId).filter(Boolean);

  if (userIds.length > 0) {
    params.append('userIds', userIds.join(','));
  } else {
    // Fall back to usernames if no user IDs are available
    const usernames = developers.map(dev => dev.username);
    params.append('usernames', usernames.join(','));
  }

  return fetchWithToken(`/api/statistics?${params.toString()}`);
}

export default function HomePage() {
  const { developers, isInitialized } = useTrackedDevelopers();
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const [data, setData] = useState<IssueStatistics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date>();
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);

  // Add a state to track when we last updated the actionRequiredTime
  // This will be used to force re-renders without changing the data
  const [lastActionRequiredUpdate, setLastActionRequiredUpdate] = useState<Date>(new Date());

  const loadData = useCallback(async () => {
    if (!isInitialized || !hasToken) return;

    try {
      setIsLoading(true);
      setProgress(0);

      // Start progress animation
      const startTime = Date.now();
      const animationDuration = 15000; // 15 seconds total animation
      const midpointDuration = 10000; // 10 seconds in the middle (30-80%)

      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        let newProgress = 0;

        if (elapsed < 1000) {
          // First second: 0-30%
          newProgress = (elapsed / 1000) * 30;
        } else if (elapsed < 1000 + midpointDuration) {
          // Middle 10 seconds: 30-80%
          const midpointElapsed = elapsed - 1000;
          newProgress = 30 + (midpointElapsed / midpointDuration) * 50;
        } else if (elapsed < animationDuration) {
          // Last 4 seconds: 80-95%
          const finalElapsed = elapsed - (1000 + midpointDuration);
          const finalDuration = animationDuration - (1000 + midpointDuration);
          newProgress = 80 + (finalElapsed / finalDuration) * 15;
        } else {
          // Cap at 95% until data is loaded
          newProgress = 95;
        }

        setProgress(Math.min(newProgress, 95));
      }, 50);

      const selectedDevelopers = developers.filter(dev => dev.selected);
      const newData = await fetchAnalytics(selectedDevelopers);

      // Clear interval and complete progress
      clearInterval(progressInterval);
      setProgress(100);

      // Small delay to show completed progress
      setTimeout(() => {
        setData(newData);
        setLastUpdated(new Date());
        setError(null);
        setIsLoading(false);
        setProgress(0);
      }, 300);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setIsLoading(false);
      setProgress(0);
      toast.error('Failed to load data. Please check your GitLab token.');
    }
  }, [developers, isInitialized, hasToken]);

  // Update the actionRequiredTime every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActionRequiredUpdate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh data every 5 minutes when enabled
  useEffect(() => {
    if (!autoRefresh || !isInitialized || !hasToken) {
      setNextAutoRefresh(null);
      return;
    }

    // Set the next refresh time to 5 minutes from now
    const nextRefresh = new Date();
    nextRefresh.setMinutes(nextRefresh.getMinutes() + 5);
    setNextAutoRefresh(nextRefresh);

    const timeUntilRefresh = nextRefresh.getTime() - new Date().getTime();

    const interval = setTimeout(() => {
      if (!isLoading) {
        loadData();
      }
    }, timeUntilRefresh);

    return () => clearTimeout(interval);
  }, [autoRefresh, isInitialized, loadData, isLoading, lastUpdated, hasToken]);

  // We don't need a separate effect to update the data
  // The component will re-render when lastActionRequiredUpdate changes
  // and the column renderer will calculate the new elapsed time

  useEffect(() => {
    if (isInitialized && hasToken) {
      loadData();
    }
  }, [isInitialized, loadData, hasToken]);

  if (!isInitialized || !isTokenInitialized) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  if (!hasToken) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Please add your GitLab token in the settings to view analytics.
          <div className="mt-4">
            <Button asChild>
              <Link href="/settings">Go to Settings</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {isLoading && progress > 0 && (
        <div className="fixed top-0 left-0 right-0 z-50">
          <Progress value={progress} className="h-1 rounded-none" />
        </div>
      )}
      <div className="fixed right-4 flex items-center gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
      </div>
      <div className="container py-10">
        {error && (
          <div className="mb-4 p-4 text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 rounded-lg">
            {error}
          </div>
        )}
        <DataTable
          columns={columns}
          data={data}
          error={error}
          onRefresh={loadData}
          lastUpdated={lastUpdated}
          // Pass lastActionRequiredUpdate to force re-renders
          actionRequiredUpdateTime={lastActionRequiredUpdate}
          isLoading={isLoading}
          autoRefresh={autoRefresh}
          onAutoRefreshChange={setAutoRefresh}
          nextRefreshTime={nextAutoRefresh}
        />
      </div>
    </>
  );
}

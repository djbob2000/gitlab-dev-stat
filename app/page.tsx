'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';
import type { IssueStatistics } from '@/lib/types';
import { ThemeToggle } from './components/theme-toggle';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTrackedDevelopers } from '@/lib/hooks/use-tracked-developers';

async function fetchAnalytics(usernames: string[]): Promise<IssueStatistics[]> {
  if (usernames.length === 0) {
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('usernames', usernames.join(','));

  console.log('Fetching data for usernames:', usernames);
  const response = await fetch(`/api/statistics?${params.toString()}`, {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}

export default function HomePage() {
  const { developers, isInitialized } = useTrackedDevelopers();
  const [data, setData] = useState<IssueStatistics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>();

  const loadData = useCallback(async () => {
    if (!isInitialized) return;
    
    console.log('loadData called');
    try {
      setIsLoading(true);
      const selectedUsernames = developers
        .filter(dev => dev.selected)
        .map(dev => dev.username);
      console.log('Selected usernames:', selectedUsernames);
      const newData = await fetchAnalytics(selectedUsernames);
      console.log('Received data:', newData);
      setData(newData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [developers, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized, loadData]);

  if (!isInitialized) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Loading developers...
        </div>
      </div>
    );
  }

  return (
    <>
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
        {isLoading && (
          <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
            Loading...
          </div>
        )}
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
        />
      </div>
    </>
  );
} 
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from './components/data-table';
import { columns } from './components/columns';
import type { DeveloperStatistics } from '@/lib/types';
import { useTrackedDevelopers } from '@/lib/hooks/use-tracked-developers';
import { ThemeToggle } from './components/theme-toggle';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function fetchAnalytics(usernames: string[]): Promise<DeveloperStatistics[]> {
  if (usernames.length === 0) {
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('usernames', usernames.join(','));

  const response = await fetch(`/api/statistics?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}

export default function HomePage() {
  const { getSelectedDevelopers } = useTrackedDevelopers();
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => {
      setLastUpdateTime(new Date());
      return fetchAnalytics(getSelectedDevelopers());
    },
  });

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
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          onRefresh={() => refetch()}
          lastUpdateTime={lastUpdateTime}
        />
      </div>
    </>
  );
} 
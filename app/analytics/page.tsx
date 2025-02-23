'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from './data-table';
import { columns } from './columns';
import type { DeveloperStatistics } from '@/lib/types';
import { useTrackedDevelopers } from '@/lib/hooks/use-tracked-developers';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

async function fetchAnalytics(usernames: string[], startDate?: string, endDate?: string): Promise<DeveloperStatistics[]> {
  if (usernames.length === 0) {
    return [];
  }
  
  const params = new URLSearchParams();
  params.append('usernames', usernames.join(','));
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`/api/statistics?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to fetch analytics');
  return response.json();
}

export default function AnalyticsPage() {
  const { getSelectedDevelopers } = useTrackedDevelopers();
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => fetchAnalytics(getSelectedDevelopers(), dateRange.startDate, dateRange.endDate),
  });

  return (
    <div className="container py-10 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Date Range Filter</CardTitle>
          <CardDescription>
            Select a date range to filter the statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRefresh={() => refetch()}
      />
    </div>
  );
} 
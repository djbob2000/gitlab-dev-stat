'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useTrackedDevelopers } from '@/lib/hooks/use-tracked-developers';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface GitLabDeveloper {
  id: number;
  username: string;
}

async function fetchProjectDevelopers(): Promise<GitLabDeveloper[]> {
  const response = await fetch('/api/gitlab/developers');
  if (!response.ok) throw new Error('Failed to fetch developers');
  return response.json();
}

export default function DevelopersPage() {
  const { developers, updateDevelopers, toggleDeveloper, isInitialized } = useTrackedDevelopers();
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    const initializeDevelopers = async () => {
      try {
        const data = await fetchProjectDevelopers();
        const updatedDevelopers = data.map(dev => ({
          userId: dev.id,
          username: dev.username,
          selected: developers.some(d => d.userId === dev.id && d.selected)
        }));
        
        updateDevelopers(updatedDevelopers);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isInitialized && !hasFetched) {
      setHasFetched(true);
      initializeDevelopers();
    }
  }, [isInitialized, hasFetched, developers, updateDevelopers]);

  // Filter developers based on search
  const filteredDevelopers = developers.filter(dev =>
    dev.username.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate selected count
  const selectedCount = developers.filter(dev => dev.selected).length;

  return (
    <div className="container mx-auto py-10 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to dashboard</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GitLab Project Developers</h1>
            <p className="text-sm text-muted-foreground">
              Select developers to track their activity in the analytics dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search developers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto text-sm text-muted-foreground">
          {selectedCount} of {developers.length} developer(s) selected
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={
                    developers.length > 0 && selectedCount === developers.length
                  }
                  onCheckedChange={(checked) => {
                    updateDevelopers(
                      developers.map(dev => ({
                        ...dev,
                        selected: !!checked
                      }))
                    );
                  }}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead>Username</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  Loading developers from GitLab...
                </TableCell>
              </TableRow>
            ) : filteredDevelopers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center">
                  No developers found
                </TableCell>
              </TableRow>
            ) : (
              filteredDevelopers.map((developer) => (
                <TableRow key={developer.username}>
                  <TableCell className="w-[50px] py-1">
                    <Checkbox
                      checked={developer.selected}
                      onCheckedChange={() => toggleDeveloper(developer.username)}
                      aria-label={`Select ${developer.username}`}
                    />
                  </TableCell>
                  <TableCell className="py-1">{developer.username}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 
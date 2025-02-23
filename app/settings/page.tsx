'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const { developers, updateDevelopers, toggleDeveloper } = useTrackedDevelopers();
  const [search, setSearch] = useState('');

  const { data: projectDevelopers = [], isLoading } = useQuery({
    queryKey: ['gitlab-developers'],
    queryFn: fetchProjectDevelopers,
  });

  // Initialize tracked developers when project developers are loaded
  useEffect(() => {
    if (projectDevelopers.length > 0 && developers.length === 0) {
      updateDevelopers(
        projectDevelopers.map(dev => ({
          username: dev.username,
          selected: false,
        }))
      );
    }
  }, [projectDevelopers, developers.length, updateDevelopers]);

  // Filter developers based on search
  const filteredDevelopers = developers.filter(dev =>
    dev.username.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate selected count
  const selectedCount = developers.filter(dev => dev.selected).length;

  return (
    <div className="container mx-auto py-10 space-y-4">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">GitLab Project Developers</h1>
        <p className="text-sm text-muted-foreground">
          Select developers to track their activity in the analytics dashboard.
        </p>
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
                  <TableCell className="w-[50px]">
                    <Checkbox
                      checked={developer.selected}
                      onCheckedChange={() => toggleDeveloper(developer.username)}
                      aria-label={`Select ${developer.username}`}
                    />
                  </TableCell>
                  <TableCell>{developer.username}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
} 
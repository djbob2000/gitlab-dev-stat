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
import { Card } from '@/components/ui/card';
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
    queryKey: ['project-developers'],
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

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tracked Developers</h1>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              type="text"
              placeholder="Search developers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Username</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredDevelopers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center">
                      No developers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevelopers.map((developer) => (
                    <TableRow key={developer.username}>
                      <TableCell>
                        <Checkbox
                          id={`developer-${developer.username}`}
                          checked={developer.selected}
                          onCheckedChange={() => toggleDeveloper(developer.username)}
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
      </Card>
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { ArrowLeft, Check, Search, Save } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { DeveloperCard } from '@/src/components/developer-card';
import React from 'react';

interface GitLabDeveloper {
  id: number;
  username: string;
  name: string;
  avatar_url: string;
  state: string;
  web_url: string;
  access_level?: number;
  expires_at?: string | null;
  selected?: boolean;
}

interface ApiResponse {
  developers: GitLabDeveloper[];
  count: number;
  message: string;
  projectName?: string;
  projectPath?: string;
}

export default function ProjectDevelopersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // Get parameters using React.use()
  const resolvedParams = React.use(params);
  const projectIdStr = resolvedParams.projectId;
  const projectId = Number(projectIdStr);

  const [developers, setDevelopers] = useState<GitLabDeveloper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const router = useRouter();
  const [selectedDevelopers, setSelectedDevelopers] = useState<Record<number, boolean>>({});
  const [origin, setOrigin] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    setOrigin(window.location.origin);
    const savedProjectName = localStorage.getItem(`project-name-${projectId}`);
    if (savedProjectName) {
      setProjectName(savedProjectName);
    } else {
      setProjectName(`Project ${projectId}`);
    }

    try {
      const savedDevelopersJSON = localStorage.getItem(`selected-developers-${projectId}`);
      if (savedDevelopersJSON) {
        const savedDevelopers = JSON.parse(savedDevelopersJSON);

        const savedSelections: Record<number, boolean> = {};
        savedDevelopers.forEach((dev: GitLabDeveloper) => {
          savedSelections[dev.id] = true;
        });

        setSelectedDevelopers(savedSelections);
      }
    } catch (error) {
      console.error('Error loading saved developers:', error);
    }

    fetchDevelopers();
  }, [projectId]);

  useEffect(() => {
    if (isTokenInitialized && !hasToken) {
      router.push('/settings');
      return;
    }

    if (isTokenInitialized && hasToken && !isNaN(projectId)) {
      fetchDevelopers();
    }
  }, [isTokenInitialized, hasToken, projectId, router]);

  useEffect(() => {
    if (developers.length > 0 && Object.keys(selectedDevelopers).length > 0) {
      const updatedDevelopers = developers.map(dev => ({
        ...dev,
        selected: !!selectedDevelopers[dev.id],
      }));
      setDevelopers(updatedDevelopers);
    }
  }, [selectedDevelopers]);

  async function fetchDevelopers() {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      console.log(`Fetching developers for project ${projectId}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${origin}/api/gitlab/project-developers/${projectId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ApiResponse;

      console.log(`Received ${data.count} developers`);

      if (Array.isArray(data.developers)) {
        if (data.projectName) {
          setProjectName(data.projectName);
          localStorage.setItem(`project-name-${projectId}`, data.projectName);
        }

        if (data.projectPath) {
          localStorage.setItem(`project-path-${projectId}`, data.projectPath);
        }

        const developersWithSelection = data.developers.map(dev => ({
          ...dev,
          selected: !!selectedDevelopers[dev.id],
        }));

        setDevelopers(developersWithSelection);
      } else {
        throw new Error('Invalid response format: developers not found in response');
      }
    } catch (error) {
      console.error('Error fetching developers:', error);

      if (error instanceof DOMException && error.name === 'AbortError') {
        setErrorMsg(
          'Request timed out after 15 seconds. The GitLab API might be slow or unavailable.'
        );
      } else {
        setErrorMsg(
          `Error fetching developers: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  }

  const toggleDeveloperSelection = (developerId: number) => {
    setSelectedDevelopers(prev => ({
      ...prev,
      [developerId]: !prev[developerId],
    }));
  };

  // Automatic saving when selectedDevelopers changes
  useEffect(() => {
    // Skip initial loading when selectedDevelopers is empty
    if (Object.keys(selectedDevelopers).length === 0 || developers.length === 0) return;

    const selectedDevs = developers.filter(dev => selectedDevelopers[dev.id]);

    try {
      localStorage.setItem(`selected-developers-${projectId}`, JSON.stringify(selectedDevs));
      // Avoid frequent notifications - notify the user only when explicitly clicking the Save button
    } catch (error) {
      console.error('Error auto-saving to localStorage:', error);
      toast.error('Failed to save selection');
    }
  }, [selectedDevelopers, developers, projectId]);

  const saveSelectedDevelopers = () => {
    const selectedDevs = developers.filter(dev => selectedDevelopers[dev.id]);

    try {
      localStorage.setItem(`selected-developers-${projectId}`, JSON.stringify(selectedDevs));
      toast.success(`${selectedDevs.length} developers selected for tracking`);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      toast.error('Failed to save selections');
    }
  };

  const goBackToProjects = () => {
    router.push('/projects');
  };

  const filteredDevelopers = searchQuery
    ? developers.filter(
        dev =>
          dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          dev.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : developers;

  if (isLoading || !isTokenInitialized) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={goBackToProjects} className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <h1 className="text-2xl font-bold">Loading...</h1>
          </div>
        </div>
        <div className="bg-card dark:bg-slate-900 border border-border rounded-md p-4 mb-4 shadow-sm">
          <div className="flex items-center">
            <svg
              className="animate-spin -ml-1 mr-3 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <p className="text-sm text-muted-foreground">Loading developers...</p>
          </div>
          {errorMsg && <p className="text-destructive mt-2 text-sm">{errorMsg}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={goBackToProjects} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-2xl font-bold">{projectName} Developers</h1>
        </div>

        <div className="flex items-center space-x-2">
          <div className="text-xs text-muted-foreground bg-muted dark:bg-slate-800 py-1 px-3 rounded-md flex items-center mr-2">
            <Save className="h-3 w-3 mr-1" />
            Auto-saving enabled
          </div>
        </div>
      </div>

      <div className="flex items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search developers..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button variant="ghost" onClick={fetchDevelopers} disabled={isLoading} className="ml-2">
          Refresh
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded mb-4">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDevelopers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">
            {searchQuery
              ? 'No developers found matching your search.'
              : 'No developers found for this project.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDevelopers.map(developer => (
            <DeveloperCard
              key={developer.id}
              developer={developer}
              onToggleSelect={toggleDeveloperSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

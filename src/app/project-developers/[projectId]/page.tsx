'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/src/components/ui/card';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { ArrowLeft, Search, Save } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { DeveloperCard } from '@/src/components/developer-card';
import { useTopLoader } from 'nextjs-toploader';
import React from 'react';
import {
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
  SELECTED_DEVELOPERS_PREFIX,
} from '@/src/constants/storage-keys';

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
  const loader = useTopLoader();

  // Refs to track loading state and prevent multiple fetches
  const isLoadingRef = useRef(false);
  const hasFetchedData = useRef(false);
  const hasInitialized = useRef(false);

  const fetchDevelopers = useCallback(async () => {
    // Prevent concurrent fetches
    if (isLoadingRef.current) {
      console.warn('Already loading developers, skipping fetch');
      return;
    }

    setIsLoading(true);
    isLoadingRef.current = true;
    loader.start();
    setErrorMsg(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${origin}/api/gitlab/project-developers/${projectId}`, {
        credentials: 'same-origin',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = (await response.json()) as ApiResponse;

      if (Array.isArray(data.developers)) {
        if (data.projectName) {
          setProjectName(data.projectName);
          localStorage.setItem(`${PROJECT_NAME_PREFIX}${projectId}`, data.projectName);
        }

        if (data.projectPath) {
          localStorage.setItem(`${PROJECT_PATH_PREFIX}${projectId}`, data.projectPath);
        }

        // We're setting the developers directly without marking as selected
        // Will compute selected status during render for better performance
        setDevelopers(data.developers);
        hasFetchedData.current = true;
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
      isLoadingRef.current = false;
      loader.done();
    }
  }, [origin, projectId, loader]);

  // Initialize component once
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    setOrigin(window.location.origin);
    const savedProjectName = localStorage.getItem(`${PROJECT_NAME_PREFIX}${projectId}`);
    if (savedProjectName) {
      setProjectName(savedProjectName);
    } else {
      setProjectName(`Project ${projectId}`);
    }

    try {
      const savedDevelopersJSON = localStorage.getItem(`${SELECTED_DEVELOPERS_PREFIX}${projectId}`);
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
  }, [projectId]);

  // Handle authentication and initial data fetch - with better dependency control
  useEffect(() => {
    if (isTokenInitialized && !hasToken) {
      router.push('/settings');
      return;
    }

    if (
      isTokenInitialized &&
      hasToken &&
      !isNaN(projectId) &&
      origin &&
      !hasFetchedData.current &&
      !isLoadingRef.current
    ) {
      fetchDevelopers();
    }
  }, [isTokenInitialized, hasToken, projectId, router, fetchDevelopers, origin]);

  // Memoize the toggle function
  const toggleDeveloperSelection = useCallback(
    (developerId: number) => {
      setSelectedDevelopers(prev => {
        const newSelections = {
          ...prev,
          [developerId]: !prev[developerId],
        };

        // Save to localStorage after toggling
        const selectedDevs = developers.filter(dev => newSelections[dev.id]);
        try {
          localStorage.setItem(
            `${SELECTED_DEVELOPERS_PREFIX}${projectId}`,
            JSON.stringify(selectedDevs)
          );
        } catch (error) {
          console.error('Error saving to localStorage:', error);
          toast.error('Failed to save selection');
        }

        return newSelections;
      });
    },
    [developers, projectId]
  );

  // Memoize filtered developers calculation to avoid recalculating on every render
  const filteredDevelopers = React.useMemo(() => {
    // First apply the search filter
    const filtered = searchQuery
      ? developers.filter(
          dev =>
            dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dev.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : developers;

    // Then annotate with selected status
    return filtered.map(dev => ({
      ...dev,
      selected: !!selectedDevelopers[dev.id],
    }));
  }, [developers, searchQuery, selectedDevelopers]);

  const goBackToProjects = useCallback(() => {
    router.push('/projects');
  }, [router]);

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
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <div className="flex justify-end">
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={goBackToProjects} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-2xl font-bold">{projectName} Developers</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchDevelopers} variant="outline" size="sm" disabled={isLoading}>
            Refresh
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="default"
            size="sm"
            className="ml-2"
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            Go to Analytics
          </Button>
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

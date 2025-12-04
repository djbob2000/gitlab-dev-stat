'use client';

import { ArrowLeft, Save, Search, UserCheck, Users, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTopLoader } from 'nextjs-toploader';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { DeveloperCard } from '@/components/developer-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PROJECT_NAME_PREFIX, PROJECT_PATH_PREFIX } from '@/constants/storage-keys';
import { useGitLabToken } from '@/hooks/use-gitlab-token';
import { useTrackedDevelopers } from '@/hooks/use-tracked-developers';

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
  excluded?: boolean;
}

interface ApiResponse {
  developers: GitLabDeveloper[];
  count: number;
  message: string;
  projectName?: string;
  projectPath?: string;
}

function ProjectDevelopersPageContent({ params }: { params: Promise<{ projectId: string }> }) {
  // Get parameters using React.use()
  const resolvedParams = React.use(params);
  const projectIdStr = resolvedParams.projectId;
  const projectId = Number(projectIdStr);

  const [developers, setDevelopers] = useState<GitLabDeveloper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string>('');
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const { updateDevelopers, toggleDeveloper, getIncludedDevelopers } =
    useTrackedDevelopers(projectId);
  const router = useRouter();
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

        // We're setting developers directly without marking as selected
        // Will compute selected status during render for better performance
        setDevelopers(data.developers);

        // Update tracked developers with new data (preserves exclusions)
        const trackedDevs = data.developers.map((dev) => ({
          userId: dev.id,
          username: dev.username,
          projectId: projectId,
          excluded: false, // Default to included
        }));
        updateDevelopers(trackedDevs);

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
  }, [origin, projectId, loader, updateDevelopers]);

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

    // Note: Exclusion state is now managed by useTrackedDevelopers hook
    // No need to load legacy selected developers from localStorage
  }, [projectId]);

  // Handle authentication and initial data fetch - with better dependency control
  useEffect(() => {
    if (isTokenInitialized && !hasToken) {
      router.push('/settings');
      return;
    }

    if (
      (hasToken || projectId === 1) && // TEMPORARY: Allow project 1 for testing
      isTokenInitialized &&
      hasToken &&
      !Number.isNaN(projectId) &&
      origin &&
      !hasFetchedData.current &&
      !isLoadingRef.current
    ) {
      fetchDevelopers();
    }
  }, [isTokenInitialized, hasToken, projectId, router, fetchDevelopers, origin]);

  // Memoize toggle function for exclusion logic
  const toggleDeveloperExclusion = useCallback(
    (developerId: number) => {
      // Use the tracked developers hook to toggle exclusion
      toggleDeveloper(developerId);
    },
    [toggleDeveloper]
  );

  // Memoize filtered developers calculation to avoid recalculating on every render
  const filteredDevelopers = React.useMemo(() => {
    // First apply search filter
    const filtered = searchQuery
      ? developers.filter(
          (dev) =>
            dev.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            dev.username.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : developers;

    // Get included developers using the hook function
    const includedDevelopers = getIncludedDevelopers();
    const includedDeveloperIds = new Set(includedDevelopers.map((dev) => dev.userId));

    // Then annotate with exclusion status
    return filtered.map((dev) => ({
      ...dev,
      excluded: !includedDeveloperIds.has(dev.id),
    }));
  }, [developers, searchQuery, getIncludedDevelopers]);

  // Calculate statistics for display
  const stats = React.useMemo(() => {
    const includedCount = getIncludedDevelopers().length;
    const excludedCount = developers.length - includedCount;
    const totalCount = developers.length;

    return {
      included: includedCount,
      excluded: excludedCount,
      total: totalCount,
      allExcluded: includedCount === 0 && totalCount > 0,
    };
  }, [developers, getIncludedDevelopers]);

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
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground mr-3" />
            <p className="text-sm text-muted-foreground">Loading developers...</p>
          </div>
          {errorMsg && <p className="text-destructive mt-2 text-sm">{errorMsg}</p>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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

      {/* Statistics and summary */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Total: {stats.total}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <span className="font-medium">Included: {stats.included}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-destructive" />
            <span className="font-medium">Excluded: {stats.excluded}</span>
          </div>
        </div>
        {stats.allExcluded && (
          <div className="mt-3 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
            <p className="text-sm text-destructive font-medium">
              All developers are excluded. Enable some developers for tracking.
            </p>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded mb-4">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          {filteredDevelopers.map((developer) => (
            <DeveloperCard
              key={developer.id}
              developer={developer}
              onToggleSelect={toggleDeveloperExclusion}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectDevelopersPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        </div>
      }
    >
      <ProjectDevelopersPageContent params={params} />
    </Suspense>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from '@/src/components/common/data-table';
import { columns } from '@/src/components/common/columns';
import type { IssueStatistics } from '@/src/types/types';
import { ThemeToggle } from '@/src/components/common/theme-toggle';
import { Settings, Server } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Progress } from '@/src/components/ui/progress';
import { fetchWithToken } from '@/src/lib/api';
import { toast } from 'sonner';

interface ProjectData {
  id: number;
  name: string;
  path: string;
  developers: { userId: number; username: string }[];
  data: IssueStatistics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

async function fetchAnalytics(
  developers: { userId: number; username: string }[],
  projectId: number,
  projectPath: string
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

  // Add project ID and path to the parameters
  params.append('projectId', projectId.toString());
  params.append('projectPath', projectPath);

  return fetchWithToken(`/api/statistics?${params.toString()}`);
}

export default function HomePage() {
  const { hasToken, isInitialized } = useGitLabToken();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [progress, setProgress] = useState(0);
  const [lastActionRequiredUpdate, setLastActionRequiredUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Update the actionRequiredTime every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActionRequiredUpdate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Load all projects that have tracked developers
  useEffect(() => {
    if (!isInitialized || !hasToken) return;

    // Get all project IDs from localStorage
    const projectIds: number[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('selected-developers-')) {
        const projectId = parseInt(key.replace('selected-developers-', ''), 10);
        if (!isNaN(projectId)) {
          projectIds.push(projectId);
        }
      }
    }

    // Initialize projects array with empty data
    const initialProjects = projectIds.map(id => {
      const projectName = localStorage.getItem(`project-name-${id}`) || `Project ${id}`;
      const projectPath =
        localStorage.getItem(`project-path-${id}`) ||
        projectName.toLowerCase().replace(/\s+/g, '-');
      const developersJSON = localStorage.getItem(`selected-developers-${id}`);
      const developers = developersJSON
        ? JSON.parse(developersJSON).map((dev: any) => ({
            userId: dev.id,
            username: dev.username,
          }))
        : [];

      return {
        id,
        name: projectName,
        path: projectPath,
        developers,
        data: [],
        isLoading: false,
        error: null,
      };
    });

    setProjects(initialProjects.filter(p => p.developers.length > 0));
  }, [isInitialized, hasToken]);

  // Load data for all projects
  const loadAllData = useCallback(async () => {
    if (!isInitialized || !hasToken || projects.length === 0 || isLoading) return;

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

      // Mark all projects as loading
      setProjects(prev =>
        prev.map(project => ({
          ...project,
          isLoading: true,
          error: null,
        }))
      );

      // Fetch data for each project in parallel
      const updatedProjects = await Promise.all(
        projects.map(async project => {
          try {
            const data = await fetchAnalytics(project.developers, project.id, project.path);
            return {
              ...project,
              data,
              isLoading: false,
              lastUpdated: new Date(),
              error: null,
            };
          } catch (err) {
            console.error(`Error loading data for project ${project.id}:`, err);
            return {
              ...project,
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch data',
            };
          }
        })
      );

      // Clear interval and complete progress
      clearInterval(progressInterval);
      setProgress(100);

      // Small delay to show completed progress
      setTimeout(() => {
        setProjects(updatedProjects);
        setIsLoading(false);
        setProgress(0);
      }, 300);
    } catch (err) {
      console.error('Error loading data:', err);
      setIsLoading(false);
      setProgress(0);
      toast.error('Failed to load data. Please check your GitLab token.');
    }
  }, [projects, isInitialized, hasToken, isLoading]);

  // Load data for a specific project
  const loadProjectData = useCallback(
    async (projectId: number) => {
      if (!isInitialized || !hasToken || isLoading) return;

      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const project = projects[projectIndex];
      if (project.isLoading) return;

      try {
        // Mark project as loading
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? { ...p, isLoading: true, error: null } : p))
        );

        const data = await fetchAnalytics(project.developers, project.id, project.path);

        // Update project data
        setProjects(prev =>
          prev.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  data,
                  isLoading: false,
                  lastUpdated: new Date(),
                  error: null,
                }
              : p
          )
        );
      } catch (err) {
        console.error(`Error loading data for project ${projectId}:`, err);
        setProjects(prev =>
          prev.map(p =>
            p.id === projectId
              ? {
                  ...p,
                  isLoading: false,
                  error: err instanceof Error ? err.message : 'Failed to fetch data',
                }
              : p
          )
        );
        toast.error(
          `Failed to load data for ${projects[projectIndex].name}. Please check your GitLab token.`
        );
      }
    },
    [projects, isInitialized, hasToken, isLoading]
  );

  // Auto-refresh data every 5 minutes when enabled
  useEffect(() => {
    if (!autoRefresh || !isInitialized || !hasToken || projects.length === 0) {
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
        loadAllData();
      }
    }, timeUntilRefresh);

    return () => clearTimeout(interval);
  }, [autoRefresh, isInitialized, loadAllData, isLoading, hasToken, projects.length]);

  // Load data on initial component mount
  useEffect(() => {
    let mounted = true;

    // Only load if initialized with token and we have projects
    if (isInitialized && hasToken && projects.length > 0 && !isLoading) {
      loadAllData();
    }

    return () => {
      mounted = false;
    };
  }, [isInitialized, hasToken, projects.length]);

  if (!isInitialized) {
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

  if (projects.length === 0) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          No projects with tracked developers found. Please select developers to track in the
          projects section.
          <div className="mt-4">
            <Button asChild>
              <Link href="/projects">Go to Projects</Link>
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
          <Link href="/projects">
            <Server className="h-5 w-5" />
            <span className="sr-only">Projects</span>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
      </div>
      <div className="container py-10">
        {projects.map(project => (
          <div key={project.id} className="mb-10">
            <DataTable
              columns={columns}
              data={project.data}
              error={project.error}
              onRefresh={() => loadProjectData(project.id)}
              lastUpdated={project.lastUpdated}
              actionRequiredUpdateTime={lastActionRequiredUpdate}
              isLoading={project.isLoading}
              autoRefresh={autoRefresh}
              onAutoRefreshChange={setAutoRefresh}
              nextRefreshTime={nextAutoRefresh}
              tableId={`project-${project.id}`}
              projectName={project.name}
            />
          </div>
        ))}
      </div>
    </>
  );
}

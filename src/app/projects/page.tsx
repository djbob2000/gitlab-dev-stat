'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { toast } from 'sonner';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Button } from '@/src/components/ui/button';
import { ProjectCard } from '@/src/components/project-card';
import { useTopLoader } from 'nextjs-toploader';
import React from 'react';
import {
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
  SELECTED_DEVELOPERS_PREFIX,
  SELECTED_PROJECTS_KEY,
} from '@/src/constants/storage-keys';

interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  description: string;
  web_url: string;
  avatar_url: string | null;
  star_count: number;
  last_activity_at: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
  };
  visibility: string;
  selected?: boolean;
}

interface GitLabDeveloper {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
  access_level?: number;
  expires_at?: string | null;
  selected?: boolean;
}

export default function ProjectsPage() {
  // Core state
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<Record<number, boolean>>({});
  const [selectedDevelopers, setSelectedDevelopers] = useState<Record<number, GitLabDeveloper[]>>(
    {}
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);

  // Hooks
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const router = useRouter();
  const loader = useTopLoader();

  /**
   * Load developers from localStorage
   */
  const loadSelectedDevelopersFromStorage = useCallback(() => {
    const devsByProject: Record<number, GitLabDeveloper[]> = {};

    // Find all project keys
    const projectKeys = Object.keys(localStorage).filter(key =>
      key.startsWith(PROJECT_NAME_PREFIX)
    );

    // Load developers for each project
    for (const key of projectKeys) {
      const projectId = Number(key.replace(PROJECT_NAME_PREFIX, ''));
      if (isNaN(projectId)) continue;

      const savedDevsJSON = localStorage.getItem(`${SELECTED_DEVELOPERS_PREFIX}${projectId}`);
      if (savedDevsJSON) {
        try {
          const savedDevs = JSON.parse(savedDevsJSON);
          if (Array.isArray(savedDevs) && savedDevs.length > 0) {
            devsByProject[projectId] = savedDevs;
          }
        } catch (error) {
          console.error(`Error loading developers for project ${projectId}:`, error);
        }
      }
    }

    return devsByProject;
  }, []);

  /**
   * Initialize data from localStorage - only runs once
   */
  useEffect(() => {
    if (isInitialized) return;

    try {
      // Load selected projects
      const savedProjects = localStorage.getItem(SELECTED_PROJECTS_KEY);
      if (savedProjects) {
        setSelectedProjects(JSON.parse(savedProjects));
      }

      // Load selected developers
      const devsByProject = loadSelectedDevelopersFromStorage();
      setSelectedDevelopers(devsByProject);

      setIsInitialized(true);

      // Redirect if no token after initialization
      if (isTokenInitialized && !hasToken) {
        router.push('/settings');
      }
    } catch (error) {
      console.error('Error initializing from localStorage:', error);
      setIsInitialized(true);
    }
  }, [isTokenInitialized, hasToken, router, isInitialized, loadSelectedDevelopersFromStorage]);

  /**
   * Fetch projects from API
   */
  const fetchProjects = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setErrorMsg(null);
    loader.start();

    try {
      const url = `${window.location.origin}/api/gitlab/projects`;
      const response = await fetch(url, { credentials: 'same-origin' });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data.projects)) {
        const projectsWithSelection = data.projects.map((project: GitLabProject) => ({
          ...project,
          selected: selectedProjects[project.id] === true,
        }));
        setProjects(projectsWithSelection);
        setHasLoadedProjects(true);
      } else {
        throw new Error('Invalid response format, missing projects array');
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setErrorMsg(error instanceof Error ? error.message : String(error));
      toast.error(
        'Failed to load projects. Please check your GitLab token and network connection.'
      );
    } finally {
      setIsLoading(false);
      loader.done();
    }
  }, [isLoading, loader, selectedProjects]);

  /**
   * Fetch projects only once after initialization
   */
  useEffect(() => {
    if (isInitialized && isTokenInitialized && hasToken && !hasLoadedProjects && !isLoading) {
      fetchProjects();
    }
  }, [isInitialized, isTokenInitialized, hasToken, hasLoadedProjects, isLoading, fetchProjects]);

  /**
   * Toggle project selection
   */
  const toggleProjectSelection = useCallback((projectId: number) => {
    setSelectedProjects(prev => {
      const newSelectedProjects = {
        ...prev,
        [projectId]: !prev[projectId],
      };

      // Save to localStorage
      localStorage.setItem(SELECTED_PROJECTS_KEY, JSON.stringify(newSelectedProjects));

      // Update projects directly
      setProjects(currentProjects =>
        currentProjects.map(project => ({
          ...project,
          selected: project.id === projectId ? !prev[projectId] : !!prev[project.id],
        }))
      );

      return newSelectedProjects;
    });
  }, []);

  /**
   * Navigate to project developers page
   */
  const goToProjectDevelopers = useCallback(
    (projectId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        localStorage.setItem(`${PROJECT_NAME_PREFIX}${projectId}`, project.name);
        localStorage.setItem(`${PROJECT_PATH_PREFIX}${projectId}`, project.path_with_namespace);
      }

      router.push(`/project-developers/${projectId}`);
    },
    [projects, router]
  );

  /**
   * Manual refresh handler
   */
  const handleRefresh = useCallback(() => {
    if (!isLoading) {
      fetchProjects();
    }
  }, [fetchProjects, isLoading]);

  /**
   * Render content based on app state
   */
  const content = useMemo(() => {
    // Render loading state
    if (!isInitialized || !isTokenInitialized) {
      return (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Your GitLab Projects</h1>
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">Initializing...</div>
        </div>
      );
    }

    // Render no token state
    if (!hasToken) {
      return (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-6">Your GitLab Projects</h1>
          <Card>
            <CardHeader>
              <CardTitle>GitLab Token Required</CardTitle>
              <CardDescription>
                Please add your GitLab token in the settings to view your projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/settings"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Go to Settings
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Render main content
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push('/')}>
              Back
            </Button>
            <h1 className="text-2xl font-bold">GitLab Projects</h1>
          </div>
          <Button onClick={handleRefresh} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {errorMsg && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errorMsg}
          </div>
        )}

        {isLoading && projects.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            Loading your GitLab projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center my-8">
            <p className="text-gray-600">
              No projects found. Please check your GitLab token permissions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onToggleSelect={toggleProjectSelection}
                onViewDevelopers={goToProjectDevelopers}
                selectedDevelopers={selectedDevelopers[project.id] || []}
              />
            ))}
          </div>
        )}
      </div>
    );
  }, [
    isInitialized,
    isTokenInitialized,
    hasToken,
    projects,
    isLoading,
    errorMsg,
    selectedDevelopers,
    router,
    handleRefresh,
    toggleProjectSelection,
    goToProjectDevelopers,
  ]);

  return content;
}

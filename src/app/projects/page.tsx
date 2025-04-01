'use client';
import { useState, useEffect, useCallback } from 'react';
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

const SELECTED_DEVELOPERS_PREFIX = 'selected-developers-';
const PROJECT_NAME_PREFIX = 'project-name-';
const PROJECT_PATH_PREFIX = 'project-path-';

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

  // Hooks
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const router = useRouter();
  const loader = useTopLoader();

  // Initialize data from localStorage
  useEffect(() => {
    if (isInitialized) return;

    try {
      // Load selected projects
      const savedProjects = localStorage.getItem('selectedProjects');
      if (savedProjects) {
        setSelectedProjects(JSON.parse(savedProjects));
      }

      // Load selected developers
      const devsByProject: Record<number, GitLabDeveloper[]> = {};
      const projectKeys = Object.keys(localStorage).filter(key => key.startsWith('project-name-'));

      for (const key of projectKeys) {
        const projectId = Number(key.replace('project-name-', ''));
        if (isNaN(projectId)) continue;

        const savedDevsJSON = localStorage.getItem(`selected-developers-${projectId}`);
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
  }, [isTokenInitialized, hasToken, router, isInitialized]);

  // Fetch projects function
  const fetchProjects = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    loader.start();

    try {
      const url = `${window.location.origin}/api/gitlab/projects`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        credentials: 'same-origin',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data && Array.isArray(data.projects)) {
        const projectsWithSelection = data.projects.map((project: GitLabProject) => ({
          ...project,
          selected: !!selectedProjects[project.id],
        }));
        setProjects(projectsWithSelection);
      } else {
        throw new Error('Invalid response format, missing projects array');
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setErrorMsg(error instanceof Error ? error.message : String(error));

      if (error instanceof Error && error.name === 'AbortError') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error(
          'Failed to load projects. Please check your GitLab token and network connection.'
        );
      }
    } finally {
      setIsLoading(false);
      loader.done();
    }
  }, [isLoading, loader, selectedProjects]);

  // Fetch projects when token is initialized and user has a token
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isInitialized && isTokenInitialized && hasToken && projects.length === 0 && !isLoading) {
      fetchProjects();
    }
  }, [isTokenInitialized, hasToken, fetchProjects, projects.length, isLoading, isInitialized]);

  // Toggle project selection
  const toggleProjectSelection = useCallback((projectId: number) => {
    setSelectedProjects(prev => {
      const newSelectedProjects = {
        ...prev,
        [projectId]: !prev[projectId],
      };

      // Save to localStorage
      localStorage.setItem('selectedProjects', JSON.stringify(newSelectedProjects));

      // Update projects directly instead of using a separate effect
      setProjects(currentProjects =>
        currentProjects.map(project => ({
          ...project,
          selected: project.id === projectId ? !prev[projectId] : !!prev[project.id],
        }))
      );

      return newSelectedProjects;
    });
  }, []);

  // Navigate to project developers page
  const goToProjectDevelopers = useCallback(
    (projectId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (project) {
        localStorage.setItem(`project-name-${projectId}`, project.name);
        localStorage.setItem(`project-path-${projectId}`, project.path_with_namespace);
      }

      router.push(`/project-developers/${projectId}`);
    },
    [projects, router]
  );

  // Load projects from localStorage
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isInitialized || !hasToken) return;

    // Get project IDs from localStorage
    const projectIds = Array.from({ length: localStorage.length })
      .map((_, i) => localStorage.key(i))
      .filter(key => key?.startsWith(SELECTED_DEVELOPERS_PREFIX))
      .map(key => parseInt(key!.replace(SELECTED_DEVELOPERS_PREFIX, ''), 10))
      .filter(id => !isNaN(id));

    // Initialize projects with empty data
    const initialProjects = projectIds.map(id => {
      const projectName = localStorage.getItem(`${PROJECT_NAME_PREFIX}${id}`) || `Project ${id}`;
      const projectPath =
        localStorage.getItem(`${PROJECT_PATH_PREFIX}${id}`) ||
        projectName.toLowerCase().replace(/\s+/g, '-');

      return {
        id,
        name: projectName,
        name_with_namespace: projectName,
        path: projectPath,
        path_with_namespace: projectPath,
        description: '',
        web_url: '',
        avatar_url: null,
        star_count: 0,
        last_activity_at: new Date().toISOString(),
        namespace: {
          id: 0,
          name: '',
          path: '',
          kind: '',
          full_path: '',
        },
        visibility: 'private',
        selected: true,
      } satisfies GitLabProject;
    });

    // Only set projects that are selected
    setProjects(initialProjects.filter(p => p.selected));
  }, [hasToken, isInitialized]);

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold">GitLab Projects</h1>
        </div>
        <Button onClick={() => fetchProjects()} disabled={isLoading}>
          Refresh
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
}

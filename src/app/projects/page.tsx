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
import { LoadingProgress } from '@/src/components/common/loading-progress';
import { toast } from 'sonner';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Button } from '@/src/components/ui/button';
import { ProjectCard } from '@/src/components/project-card';
import { fetchWithToken } from '@/src/lib/api';

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

interface ApiResponse {
  projects: GitLabProject[];
  count: number;
  message: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>('');
  const [searchQuery, _setSearchQuery] = useState<string>('');
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const router = useRouter();

  const [selectedProjects, setSelectedProjects] = useState<Record<number, boolean>>({});
  const [selectedDevelopers, setSelectedDevelopers] = useState<Record<number, GitLabDeveloper[]>>(
    {}
  );

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const url = `${origin}/api/gitlab/projects`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const data = await fetchWithToken<ApiResponse>(url, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (data && Array.isArray(data.projects)) {
          const projectsWithSelection = data.projects.map(project => ({
            ...project,
            selected: !!selectedProjects[project.id],
          }));
          setProjects(projectsWithSelection);
        } else {
          const errorText = 'Invalid response format, missing projects array';
          console.error(errorText, data);
          setErrorMsg(errorText);
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          setErrorMsg('Request timed out after 15 seconds');
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      setErrorMsg(error instanceof Error ? error.message : String(error));
      toast.error('Failed to load projects. Please check your GitLab token.');
    } finally {
      setIsLoading(false);
    }
  }, [origin, selectedProjects]);

  useEffect(() => {
    setOrigin(window.location.origin);

    const savedProjects = localStorage.getItem('selectedProjects');
    if (savedProjects) {
      try {
        setSelectedProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Error loading saved projects:', e);
      }
    }

    // Load selected developers for each project
    const loadSelectedDevelopers = async () => {
      const devsByProject: Record<number, GitLabDeveloper[]> = {};

      // Get all project IDs from localStorage keys that match 'project-name-*'
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
    };

    loadSelectedDevelopers();
  }, []);

  useEffect(() => {
    if (isTokenInitialized && !hasToken) {
      router.push('/settings');
      return;
    }

    if (isTokenInitialized && hasToken) {
      fetchProjects();
    }
  }, [isTokenInitialized, hasToken, router, fetchProjects]);

  // Update selected status when selectedProjects changes
  useEffect(() => {
    if (projects.length > 0) {
      setProjects(prevProjects =>
        prevProjects.map(project => ({
          ...project,
          selected: !!selectedProjects[project.id],
        }))
      );
    }
  }, [selectedProjects, projects.length]);

  const _filteredProjects = searchQuery
    ? projects.filter(
        project =>
          project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.path_with_namespace.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : projects;

  const _formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const toggleProjectSelection = (projectId: number) => {
    const newSelectedProjects = {
      ...selectedProjects,
      [projectId]: !selectedProjects[projectId],
    };

    setSelectedProjects(newSelectedProjects);
    localStorage.setItem('selectedProjects', JSON.stringify(newSelectedProjects));
  };

  const goToProjectDevelopers = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      localStorage.setItem(`project-name-${projectId}`, project.name);
      localStorage.setItem(`project-path-${projectId}`, project.path_with_namespace);
    }

    router.push(`/project-developers/${projectId}`);
  };

  const _saveAndGoToAnalytics = () => {
    const selectedProjs = projects.filter(project => selectedProjects[project.id]);

    if (selectedProjs.length === 0) {
      toast.error('Please select at least one project to track');
      return;
    }

    toast.success(`${selectedProjs.length} projects selected for tracking`);
    router.push('/');
  };

  if (isLoading || !isTokenInitialized) {
    return (
      <div className="container py-8">
        <LoadingProgress isLoading={true} duration={10000} />
        <h1 className="text-3xl font-bold mb-6">Your GitLab Projects</h1>
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          Loading your GitLab projects...
        </div>
      </div>
    );
  }

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
      <LoadingProgress isLoading={isLoading} duration={10000} />
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/')}>
            Back
          </Button>
          <h1 className="text-2xl font-bold">GitLab Projects</h1>
        </div>
        <Button onClick={fetchProjects} disabled={isLoading}>
          Refresh
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMsg}
        </div>
      )}

      {projects.length === 0 ? (
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

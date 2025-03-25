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
import { Skeleton } from '@/src/components/ui/skeleton';
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

  useEffect(() => {
    if (projects.length > 0 && Object.keys(selectedProjects).length > 0) {
      const updatedProjects = projects.map(project => ({
        ...project,
        selected: !!selectedProjects[project.id],
      }));
      setProjects(updatedProjects);
    }
  }, [selectedProjects]);

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
      toast.error('Пожалуйста, выберите хотя бы один проект для отслеживания');
      toast.error('Please select at least one project to track');
      return;
    }

    toast.success(`Выбрано ${selectedProjs.length} проектов для отслеживания`);
    toast.success(`Selected ${selectedProjs.length} projects for tracking`);
    router.push('/');
  };

  if (isLoading || !isTokenInitialized) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Your GitLab Projects</h1>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="mb-4">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/4" />
            </CardContent>
          </Card>
        ))}
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">GitLab Projects</h1>
        <Button onClick={fetchProjects} disabled={isLoading}>
          Retry Fetch
        </Button>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMsg}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

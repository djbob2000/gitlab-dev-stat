'use client';
import { useState, useEffect } from 'react';
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
import { Badge } from '@/src/components/ui/badge';
import { toast } from 'sonner';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { fetchWithToken } from '@/src/lib/api';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Button } from '@/src/components/ui/button';
import { Eye, Users, Check } from 'lucide-react';
import { ProjectCard } from '@/src/components/project-card';
import { Input } from '@/src/components/ui/input';

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
  const [responseInfo, setResponseInfo] = useState<string | null>(null);
  const [origin, setOrigin] = useState<string>('');
  const { hasToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const router = useRouter();

  const [selectedProjects, setSelectedProjects] = useState<Record<number, boolean>>({});

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
    console.log('Component state:', {
      isTokenInitialized,
      hasToken,
      isLoading,
      projectsCount: projects.length,
    });
  }, [isTokenInitialized, hasToken, isLoading, projects]);

  useEffect(() => {
    if (isTokenInitialized && !hasToken) {
      console.log('No token, redirecting to settings');
      router.push('/settings');
      return;
    }

    if (isTokenInitialized && hasToken) {
      console.log('Token initialized and present, fetching projects');
      fetchProjects();
    }
  }, [isTokenInitialized, hasToken, router]);

  useEffect(() => {
    if (projects.length > 0 && Object.keys(selectedProjects).length > 0) {
      const updatedProjects = projects.map(project => ({
        ...project,
        selected: !!selectedProjects[project.id],
      }));
      setProjects(updatedProjects);
    }
  }, [selectedProjects]);

  async function fetchProjects() {
    console.log('Starting fetchProjects function');
    setIsLoading(true);
    setErrorMsg(null);
    setResponseInfo(null);
    try {
      console.log('Making API request to /api/gitlab/projects');

      console.log('Base URL:', origin);

      const url = `${origin}/api/gitlab/projects`;
      console.log('Full URL:', url);
      setResponseInfo(`Requesting: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, {
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log('Response status:', response.status);
        setResponseInfo(prev => `${prev || ''}\nStatus: ${response.status}`);

        if (!response.ok) {
          const errorText = `API request failed with status ${response.status}`;
          setErrorMsg(errorText);
          throw new Error(errorText);
        }

        const responseText = await response.text();

        if (!responseText || responseText.trim() === '') {
          setErrorMsg('Empty response received from server');
          setIsLoading(false);
          return;
        }

        console.log('Raw response length:', responseText.length);
        setResponseInfo(prev => `${prev || ''}\nResponse size: ${responseText.length} bytes`);

        let data: ApiResponse;
        try {
          data = JSON.parse(responseText) as ApiResponse;
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          setErrorMsg('Failed to parse response JSON');
          setIsLoading(false);
          return;
        }

        console.log('API response received, parsing data...');

        if (data && Array.isArray(data.projects)) {
          console.log(`Received ${data.projects.length} projects`);
          setResponseInfo(prev => `${prev || ''}\nReceived ${data.projects.length} projects`);
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
        clearTimeout(timeoutId);
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
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
    }

    router.push(`/project-developers/${projectId}`);
  };

  const saveAndGoToAnalytics = () => {
    const selectedCount = Object.values(selectedProjects).filter(Boolean).length;

    if (selectedCount === 0) {
      toast.error('Пожалуйста, выберите хотя бы один проект для отслеживания');
      return;
    }

    toast.success(`Выбрано ${selectedCount} проектов для отслеживания`);
    router.push('/');
  };

  if (isLoading || !isTokenInitialized) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Your GitLab Projects</h1>
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded mb-4">
          <h2 className="font-bold">Debug Info:</h2>
          <p>isLoading: {String(isLoading)}</p>
          <p>isTokenInitialized: {String(isTokenInitialized)}</p>
          <p>hasToken: {String(hasToken)}</p>
          <p>Origin: {origin}</p>
          {errorMsg && <p className="text-red-500">Error: {errorMsg}</p>}
          {responseInfo && (
            <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
              {responseInfo}
            </pre>
          )}
          <button onClick={fetchProjects} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
            Retry Fetch
          </button>
        </div>
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

      {responseInfo && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4">
          {responseInfo}
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

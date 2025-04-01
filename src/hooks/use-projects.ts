import { useState, useEffect, useCallback, useRef } from 'react';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { useTopLoader } from 'nextjs-toploader';
import { toast } from 'sonner';
import { fetchAnalytics } from '@/src/lib/api-utils';
import {
  ProjectData,
  SELECTED_DEVELOPERS_PREFIX,
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
} from '@/src/types/project-types';

/**
 * Custom hook for managing projects and their data
 */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { hasToken, isInitialized } = useGitLabToken();
  const loader = useTopLoader();
  const hasLoadedInitialData = useRef(false);

  // Load projects from localStorage
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
      const developersJSON = localStorage.getItem(`${SELECTED_DEVELOPERS_PREFIX}${id}`);
      const developers = developersJSON
        ? JSON.parse(developersJSON).map((dev: { id: number; username: string }) => ({
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
    if (!isInitialized || !hasToken || isLoading || projects.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      loader.start();

      // Mark all projects as loading
      setProjects(prev =>
        prev.map(project => ({
          ...project,
          isLoading: true,
          error: null,
        }))
      );

      // Load data for each project in parallel
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
            return {
              ...project,
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch data',
            };
          }
        })
      );

      loader.done();
      setProjects(updatedProjects);
    } catch (_err) {
      toast.error('Failed to load data. Please check your GitLab token.');
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, hasToken, loader, projects, isLoading]);

  // Load data for a specific project
  const loadProjectData = useCallback(
    async (projectId: number) => {
      if (!isInitialized || !hasToken || isLoading) return;

      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const project = projects[projectIndex];
      if (project.isLoading) return;

      try {
        setIsLoading(true);
        loader.start();

        // Mark project as loading
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? { ...p, isLoading: true, error: null } : p))
        );

        // Load data
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

        loader.done();
      } catch (err) {
        loader.done();
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
        toast.error(`Failed to load data for project ${project.name}.`);
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized, hasToken, projects, loader, isLoading]
  );

  // Initial data load
  useEffect(() => {
    if (
      isInitialized &&
      hasToken &&
      projects.length > 0 &&
      !isLoading &&
      !hasLoadedInitialData.current
    ) {
      hasLoadedInitialData.current = true;
      // Small delay for UI readiness
      setTimeout(loadAllData, 500);
    }
  }, [isInitialized, hasToken, loadAllData, projects.length, isLoading]);

  const anyProjectLoading = projects.some(project => project.isLoading);

  return {
    projects,
    isLoading: isLoading || anyProjectLoading,
    loadProjectData,
    loadAllData,
  };
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { useTopLoader } from 'nextjs-toploader';
import { toast } from 'sonner';
import { fetchAnalytics } from '@/src/lib/api-utils';
import { ProjectData } from '@/src/types';
import {
  SELECTED_DEVELOPERS_PREFIX,
  PROJECT_NAME_PREFIX,
  PROJECT_PATH_PREFIX,
  SELECTED_PROJECTS_KEY,
} from '@/src/constants/storage-keys';

/**
 * Custom hook for managing projects and their data
 */
export function useProjects() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { hasToken, isInitialized } = useGitLabToken();
  const loader = useTopLoader();
  const hasLoadedInitialData = useRef(false);
  const hasInitializedProjects = useRef(false);

  /**
   * Get projects data from localStorage
   */
  const getProjectsFromStorage = useCallback((): ProjectData[] => {
    // Get project IDs from localStorage
    const projectIds = Array.from({ length: localStorage.length })
      .map((_, i) => localStorage.key(i))
      .filter(key => key?.startsWith(SELECTED_DEVELOPERS_PREFIX))
      .map(key => parseInt(key!.replace(SELECTED_DEVELOPERS_PREFIX, ''), 10))
      .filter(id => !isNaN(id));

    // Get selected projects from localStorage
    const savedSelectedProjects = localStorage.getItem(SELECTED_PROJECTS_KEY);
    const selectedProjects: Record<number, boolean> = savedSelectedProjects
      ? JSON.parse(savedSelectedProjects)
      : {};

    // Initialize projects with data from localStorage
    return projectIds.map(id => {
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
        statistics: {
          totalIssues: 0,
          openIssues: 0,
          closedIssues: 0,
          averageTimeToClose: 0,
          issues: [],
        },
        isLoading: false,
        error: null,
        selected: selectedProjects[id] === true,
      };
    });
  }, []);

  // Load projects from localStorage - once after initialization
  useEffect(() => {
    if (!isInitialized || !hasToken || hasInitializedProjects.current) return;

    hasInitializedProjects.current = true;

    try {
      // Get selectedProjects from localStorage
      const savedSelectedProjects = localStorage.getItem(SELECTED_PROJECTS_KEY);
      const selectedProjects: Record<number, boolean> = savedSelectedProjects
        ? JSON.parse(savedSelectedProjects)
        : {};

      // Get projects with developers from localStorage
      const projectsWithData = getProjectsFromStorage();

      // Only include projects that are explicitly selected AND have developers
      const filteredProjects = projectsWithData.filter(
        p => p.developers.length > 0 && selectedProjects[p.id] === true
      );

      setProjects(filteredProjects);
    } catch (error) {
      console.error('Error loading projects from localStorage:', error);
    }
  }, [isInitialized, hasToken, getProjectsFromStorage]);

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

      setProjects(updatedProjects);
    } catch (_err) {
      toast.error('Failed to load data. Please check your GitLab token.');
    } finally {
      setIsLoading(false);
      loader.done();
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
      } catch (err) {
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
        loader.done();
      }
    },
    [isInitialized, hasToken, projects, loader, isLoading]
  );

  // Initial data load - only once after projects are loaded
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

  // Compute if any project is loading
  const anyProjectLoading = projects.some(project => project.isLoading);

  return {
    projects,
    isLoading: isLoading || anyProjectLoading,
    loadProjectData,
    loadAllData,
  };
}

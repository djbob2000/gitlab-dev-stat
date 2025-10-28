import { useState, useEffect, useCallback, useRef } from 'react';
import { useGitLabToken } from '@/hooks/use-gitlab-token';
import { useTopLoader } from 'nextjs-toploader';
import { toast } from 'sonner';
import { fetchAnalytics } from '@/lib/api-utils';
import type { ProjectData } from '@/types';
import type { GitLabProject } from '@/types/gitlab/projects';
import {
  SELECTED_DEVELOPERS_PREFIX,
  SELECTED_PROJECTS_KEY,
} from '@/constants/storage-keys';

/**
 * Custom hook for managing projects and their data
 */
export function useProjects(initialProjects?: GitLabProject[]) {
  const [projects, setProjects] = useState<ProjectData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { hasToken, isInitialized } = useGitLabToken();
  const loader = useTopLoader();
  const hasLoadedInitialData = useRef(false);
  const hasInitializedFromServer = useRef(false);

  /**
   * Enrich server projects with localStorage data
   */
  const enrichProjectsWithLocalStorage = useCallback((serverProjects: GitLabProject[]): ProjectData[] => {
    // Get selected projects from localStorage
    const savedSelectedProjects = localStorage.getItem(SELECTED_PROJECTS_KEY);
    const selectedProjects: Record<number, boolean> = savedSelectedProjects
      ? JSON.parse(savedSelectedProjects)
      : {};

    return serverProjects.map((project) => {
      const developersJSON = localStorage.getItem(`${SELECTED_DEVELOPERS_PREFIX}${project.id}`);
      const developers = developersJSON
        ? JSON.parse(developersJSON).map((dev: { id: number; username: string }) => ({
            userId: dev.id,
            username: dev.username,
          }))
        : [];

      return {
        id: project.id,
        name: project.name,
        path: project.path,
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
        lastUpdated: new Date(),
        selected: selectedProjects[project.id] === true,
      };
    });
  }, []);

  // Initialize projects from server data and enrich with localStorage
  useEffect(() => {
    if (!isInitialized || !hasToken || hasInitializedFromServer.current || !initialProjects) return;

    hasInitializedFromServer.current = true;

    try {
      // Enrich server projects with localStorage data
      const enrichedProjects = enrichProjectsWithLocalStorage(initialProjects);

      // Only include projects that have developers to track
      const filteredProjects = enrichedProjects.filter((p) => p.developers.length > 0);

      setProjects(filteredProjects);
    } catch (error) {
      console.error('Error initializing projects from server data:', error);
    }
  }, [isInitialized, hasToken, initialProjects, enrichProjectsWithLocalStorage]);

  // Load data for all projects
  const loadAllData = useCallback(async () => {
    if (!isInitialized || !hasToken || isLoading || projects === null || projects.length === 0) {
      return;
    }

    try {
      setIsLoading(true);
      loader.start();

      // Mark all projects as loading
      setProjects((prev) =>
        prev
          ? prev.map((project) => ({
              ...project,
              isLoading: true,
              error: null,
            }))
          : null
      );

      // Load data for each project in parallel
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
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
      if (!isInitialized || !hasToken || isLoading || projects === null) return;

      const projectIndex = projects.findIndex((p) => p.id === projectId);
      if (projectIndex === -1) return;

      const project = projects[projectIndex];
      if (project.isLoading) return;

      try {
        setIsLoading(true);
        loader.start();

        // Mark project as loading
        setProjects((prev) =>
          prev
            ? prev.map((p) => (p.id === projectId ? { ...p, isLoading: true, error: null } : p))
            : null
        );

        // Load data
        const data = await fetchAnalytics(project.developers, project.id, project.path);

        // Update project data
        setProjects((prev) =>
          prev
            ? prev.map((p) =>
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
            : null
        );
      } catch (err) {
        setProjects((prev) =>
          prev
            ? prev.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      isLoading: false,
                      error: err instanceof Error ? err.message : 'Failed to fetch data',
                    }
                  : p
              )
            : null
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
      projects !== null &&
      projects.length > 0 &&
      !isLoading &&
      !hasLoadedInitialData.current
    ) {
      hasLoadedInitialData.current = true;
      // Small delay for UI readiness
      setTimeout(loadAllData, 500);
    }
  }, [isInitialized, hasToken, loadAllData, projects, isLoading]);

  // Compute if any project is loading
  const anyProjectLoading = projects?.some((project) => project.isLoading) || false;

  return {
    projects,
    isLoading: isLoading || anyProjectLoading,
    loadProjectData,
    loadAllData,
  };
}

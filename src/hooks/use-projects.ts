import { useTopLoader } from 'nextjs-toploader';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  getTrackedDevelopersKey,
  PROJECT_ORDER_KEY,
  SELECTED_PROJECTS_KEY,
} from '@/constants/storage-keys';
import { useGitLabToken } from '@/hooks/use-gitlab-token';
import type { TrackedDeveloper } from '@/hooks/use-tracked-developers';
import { fetchAnalytics } from '@/lib/api-utils';
import type { ProjectData } from '@/types';
import type { GitLabProject } from '@/types/gitlab/projects';

/**
 * Utility function to get included developers for a specific project from localStorage
 */
const getIncludedDevelopersForProject = (projectId: number) => {
  const storageKey = getTrackedDevelopersKey(projectId);
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const developers = JSON.parse(stored) as TrackedDeveloper[];
      return developers.filter((dev) => !dev.excluded && dev.projectId === projectId);
    }
    return [];
  } catch (error) {
    console.error('Error reading developers from localStorage:', error);
    return [];
  }
};

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
   * Enrich server projects with tracked developers data
   */
  const enrichProjectsWithLocalStorage = useCallback(
    (serverProjects: GitLabProject[]): ProjectData[] => {
      // Get selected projects from localStorage
      const savedSelectedProjects = localStorage.getItem(SELECTED_PROJECTS_KEY);
      const selectedProjects: Record<string, boolean> = savedSelectedProjects
        ? JSON.parse(savedSelectedProjects)
        : {};

      return serverProjects.map((project) => {
        // Get included developers for this project from tracked developers
        const includedDevelopers = getIncludedDevelopersForProject(project.id);

        return {
          id: project.id,
          name: project.name,
          path: project.path,
          developers: includedDevelopers,
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
          selected: selectedProjects[project.id.toString()] === true,
        };
      });
    },
    []
  );

  // Initialize projects from server data and enrich with localStorage
  useEffect(() => {
    if (!isInitialized || !hasToken || hasInitializedFromServer.current || !initialProjects) return;

    hasInitializedFromServer.current = true;

    try {
      // Enrich server projects with localStorage data
      const enrichedProjects = enrichProjectsWithLocalStorage(initialProjects);

      // Only include projects that have developers to track AND are selected
      const filteredProjects = enrichedProjects.filter(
        (p) => p.developers.length > 0 && p.selected
      );

      // Apply saved sort order
      try {
        const savedOrder = localStorage.getItem(PROJECT_ORDER_KEY);
        if (savedOrder) {
          const orderIds: number[] = JSON.parse(savedOrder);

          filteredProjects.sort((a, b) => {
            const indexA = orderIds.indexOf(a.id);
            const indexB = orderIds.indexOf(b.id);

            // If both exist in order, sort by index
            if (indexA !== -1 && indexB !== -1) {
              return indexA - indexB;
            }
            // If only A exists, it comes first
            if (indexA !== -1) return -1;
            // If only B exists, it comes first
            if (indexB !== -1) return 1;
            // If neither exists, keep original order (stable sort)
            return 0;
          });
        }
      } catch (e) {
        console.error('Failed to parse project order:', e);
      }

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
      const promises = projects.map(async (project) => {
        try {
          const data = await fetchAnalytics(project.developers, project.id, project.path);

          setProjects((prev) =>
            prev
              ? prev.map((p) =>
                  p.id === project.id
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
                  p.id === project.id
                    ? {
                        ...p,
                        isLoading: false,
                        error: err instanceof Error ? err.message : 'Failed to fetch data',
                      }
                    : p
                )
              : null
          );
        }
      });

      await Promise.all(promises);
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
        const updatedProjects = projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                data,
                isLoading: false,
                lastUpdated: new Date(),
                error: null,
              }
            : p
        );

        setProjects(updatedProjects);
      } catch (err) {
        const updatedProjects = projects.map((p) =>
          p.id === projectId
            ? {
                ...p,
                isLoading: false,
                error: err instanceof Error ? err.message : 'Failed to fetch data',
              }
            : p
        );

        setProjects(updatedProjects);
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

  // Reorder projects
  const reorderProjects = useCallback((newOrder: number[]) => {
    setProjects((prev) => {
      if (!prev) return null;

      const newProjects = [...prev].sort((a, b) => {
        const indexA = newOrder.indexOf(a.id);
        const indexB = newOrder.indexOf(b.id);
        // Elements not in newOrder will be at the end
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      return newProjects;
    });

    // Save to localStorage
    localStorage.setItem(PROJECT_ORDER_KEY, JSON.stringify(newOrder));
  }, []);

  // Compute if any project is loading
  const anyProjectLoading = projects?.some((project) => project.isLoading) || false;

  return {
    projects,
    isLoading: isLoading || anyProjectLoading,
    loadProjectData,
    loadAllData,
    reorderProjects,
  };
}
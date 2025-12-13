'use client';

import Link from 'next/link';
import { use } from 'react';
// Import extracted components and hooks
import { Header } from '@/components/home/Header';
import { ProjectsList } from '@/components/home/ProjectsList';
import { Button } from '@/components/ui/button';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useProjects } from '@/hooks/use-projects';
import type { GitLabProject } from '@/types/gitlab/projects';

/**
 * Клієнтський компонент головної сторінки з підтримкою хука use()
 */
export default function HomePageClient({
  tokenPromise,
  projectsPromise,
}: {
  tokenPromise: Promise<{ hasToken: boolean }>;
  projectsPromise: Promise<GitLabProject[]>;
}) {
  // Використовуємо хук use() для отримання даних з промісів
  const tokenData = use(tokenPromise);
  const projectsData = use(projectsPromise);

  const { hasToken } = tokenData;
  const projects = projectsData;

  // Хук для логіки завантаження проектів з серверними даними
  const {
    projects: enrichedProjects,
    loadAllData,
    isLoading,
    reorderProjects,
  } = useProjects(projects);

  // Хук для логіки автооновлення
  const { autoRefresh, nextAutoRefresh, handleAutoRefreshChange } = useAutoRefresh(
    loadAllData,
    isLoading
  );

  // No token state
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

  // No projects state after loading
  if (!enrichedProjects || enrichedProjects.length === 0) {
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

  // Main content
  return (
    <>
      <Header
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        nextRefreshTime={nextAutoRefresh}
        onRefresh={loadAllData}
        onAutoRefreshChange={handleAutoRefreshChange}
      />
      <div className="container py-10 pt-0">
        <ProjectsList projects={enrichedProjects} onReorder={reorderProjects} />
      </div>
    </>
  );
}
'use client';

import React, { useState, useEffect } from 'react';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';

// Import extracted components and hooks
import { Header } from '@/src/components/home/Header';
import { ProjectsList } from '@/src/components/home/ProjectsList';
import { useProjects } from '@/src/hooks/use-projects';
import { useAutoRefresh } from '@/src/hooks/use-auto-refresh';

/**
 * Main page component
 */
export default function HomePage() {
  const { hasToken, isInitialized } = useGitLabToken();
  const [_lastActionRequiredUpdate, setLastActionRequiredUpdate] = useState<Date>(new Date());

  // Custom hooks
  const { projects, isLoading, loadProjectData: _loadProjectData, loadAllData } = useProjects();
  const { autoRefresh, nextAutoRefresh, handleAutoRefreshChange } = useAutoRefresh(
    loadAllData,
    isLoading
  );

  // Update action required time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActionRequiredUpdate(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (!isInitialized) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

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

  // No projects state
  if (projects.length === 0) {
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
        <ProjectsList projects={projects} />
      </div>
    </>
  );
}

import { Suspense } from 'react';
import { unstable_noStore as noStore } from 'next/cache';
import type { GitLabProject } from '@/types/gitlab/projects';
import HomePageClient from './home-page-client';
import { hasValidToken } from './actions/token';
import { getUserProjects } from './actions/projects';
import { PageSkeleton } from '@/components/home/page-skeleton';

export const dynamic = 'force-dynamic';

/**
 * Серверний компонент з Suspense для потокової передачі даних
 */
export default function Page() {
  noStore(); // Prevent prerendering since we use cookies()

  // Використовуємо Server Actions для отримання реальних даних
  const tokenPromise = hasValidToken();
  const projectsPromise = getUserProjects();

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<PageSkeleton />}>
        <HomePageClient
          tokenPromise={tokenPromise}
          projectsPromise={projectsPromise}
        />
      </Suspense>
    </div>
  );
}
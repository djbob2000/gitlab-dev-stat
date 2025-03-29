'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { DataTable } from '@/src/components/common/data-table';
import { columns } from '@/src/components/common/columns';
import type { IssueStatistics } from '@/src/types/types';
import { ThemeToggle } from '@/src/components/common/theme-toggle';
import { Settings, Server } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { useTopLoader } from 'nextjs-toploader';
import { fetchWithToken } from '@/src/lib/api';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import { RefreshControls } from '@/src/components/common/refresh-controls';

// Типы
interface ProjectData {
  id: number;
  name: string;
  path: string;
  developers: { userId: number; username: string }[];
  data: IssueStatistics[];
  isLoading: boolean;
  error: string | null;
  lastUpdated?: Date;
}

// Выделенная функция API запроса
async function fetchAnalytics(
  developers: { userId: number; username: string }[],
  projectId: number,
  projectPath: string
): Promise<IssueStatistics[]> {
  if (developers.length === 0) {
    return [];
  }

  const params = new URLSearchParams();

  // Prefer user IDs over usernames for better reliability
  const userIds = developers.map(dev => dev.userId).filter(Boolean);

  if (userIds.length > 0) {
    params.append('userIds', userIds.join(','));
  } else {
    // Fall back to usernames if no user IDs are available
    const usernames = developers.map(dev => dev.username);
    params.append('usernames', usernames.join(','));
  }

  // Add project ID and path to the parameters
  params.append('projectId', projectId.toString());
  params.append('projectPath', projectPath);

  return fetchWithToken(`/api/statistics?${params.toString()}`);
}

/**
 * Главная страница приложения
 */
export default function HomePage() {
  // Глобальное состояние и хуки
  const { hasToken, isInitialized } = useGitLabToken();
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [lastActionRequiredUpdate, setLastActionRequiredUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextAutoRefresh, setNextAutoRefresh] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const loader = useTopLoader();

  // Refs для предотвращения гонок состояний
  const isLoadingRef = useRef(false);
  const hasLoadedInitialData = useRef(false);

  // Ref для управления автообновлением
  const autoRefreshState = useRef({
    isEnabled: false,
    timerId: null as NodeJS.Timeout | null,
    nextRefreshTime: null as Date | null,
  });

  // Обновляем время для проверки действий каждую минуту
  useEffect(() => {
    const interval = setInterval(() => {
      setLastActionRequiredUpdate(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Загрузка проектов с отслеживаемыми разработчиками
  useEffect(() => {
    if (!isInitialized || !hasToken) return;

    // Получаем ID проектов из localStorage
    const projectIds = Array.from({ length: localStorage.length })
      .map((_, i) => localStorage.key(i))
      .filter(key => key?.startsWith('selected-developers-'))
      .map(key => parseInt(key!.replace('selected-developers-', ''), 10))
      .filter(id => !isNaN(id));

    // Инициализируем проекты с пустыми данными
    const initialProjects = projectIds.map(id => {
      const projectName = localStorage.getItem(`project-name-${id}`) || `Project ${id}`;
      const projectPath =
        localStorage.getItem(`project-path-${id}`) ||
        projectName.toLowerCase().replace(/\s+/g, '-');
      const developersJSON = localStorage.getItem(`selected-developers-${id}`);
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

  // Загрузка данных для всех проектов
  const loadAllData = useCallback(async () => {
    // Предотвращаем параллельную загрузку
    if (!isInitialized || !hasToken || isLoadingRef.current || projects.length === 0) {
      return;
    }

    try {
      // Устанавливаем статус загрузки
      setIsLoading(true);
      isLoadingRef.current = true;
      loader.start();

      // Помечаем все проекты как загружающиеся
      setProjects(prev =>
        prev.map(project => ({
          ...project,
          isLoading: true,
          error: null,
        }))
      );

      // Параллельно загружаем данные для каждого проекта
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

      // Завершаем загрузку
      loader.done();
      setProjects(updatedProjects);
    } catch (err) {
      toast.error('Failed to load data. Please check your GitLab token.');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [isInitialized, hasToken, loader, projects]);

  // Загрузка данных для конкретного проекта
  const loadProjectData = useCallback(
    async (projectId: number) => {
      if (!isInitialized || !hasToken || isLoadingRef.current) return;

      const projectIndex = projects.findIndex(p => p.id === projectId);
      if (projectIndex === -1) return;

      const project = projects[projectIndex];
      if (project.isLoading) return;

      try {
        // Устанавливаем загрузку
        setIsLoading(true);
        isLoadingRef.current = true;
        loader.start();

        // Помечаем проект как загружающийся
        setProjects(prev =>
          prev.map(p => (p.id === projectId ? { ...p, isLoading: true, error: null } : p))
        );

        // Загружаем данные
        const data = await fetchAnalytics(project.developers, project.id, project.path);

        // Обновляем данные проекта
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
        isLoadingRef.current = false;
      }
    },
    [isInitialized, hasToken, projects, loader]
  );

  // Обработчик изменения состояния автообновления
  const handleAutoRefreshChange = useCallback((enabled: boolean) => {
    if (enabled === autoRefreshState.current.isEnabled) return;

    if (enabled) {
      // Включаем автообновление
      const nextRefresh = new Date(Date.now() + 5 * 60 * 1000);

      // Обновляем состояние
      autoRefreshState.current.nextRefreshTime = nextRefresh;
      setNextAutoRefresh(nextRefresh);

      // Обновляем флаг после установки времени
      autoRefreshState.current.isEnabled = true;
      setAutoRefresh(true);

      // Планируем обновление
      scheduleNextRefresh();
    } else {
      // Выключаем автообновление
      autoRefreshState.current.isEnabled = false;
      setAutoRefresh(false);

      // Очищаем таймер
      if (autoRefreshState.current.timerId) {
        clearTimeout(autoRefreshState.current.timerId);
        autoRefreshState.current.timerId = null;
      }

      // Очищаем время
      autoRefreshState.current.nextRefreshTime = null;
      setNextAutoRefresh(null);
    }
  }, []);

  // Функция планирования следующего обновления
  const scheduleNextRefresh = useCallback(() => {
    // Очищаем предыдущий таймер
    if (autoRefreshState.current.timerId) {
      clearTimeout(autoRefreshState.current.timerId);
      autoRefreshState.current.timerId = null;
    }

    // Если автообновление выключено, выходим
    if (!autoRefreshState.current.isEnabled) return;

    // Устанавливаем время следующего обновления если не задано
    if (!autoRefreshState.current.nextRefreshTime) {
      const nextRefresh = new Date(Date.now() + 5 * 60 * 1000);
      autoRefreshState.current.nextRefreshTime = nextRefresh;
      setNextAutoRefresh(nextRefresh);
    }

    // Вычисляем оставшееся время
    const timeUntilRefresh = autoRefreshState.current.nextRefreshTime.getTime() - Date.now();

    // Если времени не осталось, обновляем сейчас
    if (timeUntilRefresh <= 1000) {
      if (autoRefreshState.current.isEnabled && !isLoadingRef.current) {
        loadAllData().finally(() => {
          autoRefreshState.current.nextRefreshTime = null;
          if (autoRefreshState.current.isEnabled) {
            scheduleNextRefresh();
          }
        });
      }
      return;
    }

    // Устанавливаем таймер
    autoRefreshState.current.timerId = setTimeout(() => {
      autoRefreshState.current.timerId = null;

      if (autoRefreshState.current.isEnabled && !isLoadingRef.current) {
        loadAllData().finally(() => {
          autoRefreshState.current.nextRefreshTime = null;
          if (autoRefreshState.current.isEnabled) {
            scheduleNextRefresh();
          }
        });
      }
    }, timeUntilRefresh);
  }, [loadAllData]);

  // Синхронизация состояния автообновления при монтировании
  useEffect(() => {
    autoRefreshState.current.isEnabled = autoRefresh;

    if (autoRefresh && !autoRefreshState.current.timerId && !isLoadingRef.current) {
      scheduleNextRefresh();
    }

    return () => {
      if (autoRefreshState.current.timerId) {
        clearTimeout(autoRefreshState.current.timerId);
        autoRefreshState.current.timerId = null;
      }
    };
  }, [autoRefresh, scheduleNextRefresh]);

  // Первоначальная загрузка данных
  useEffect(() => {
    if (
      isInitialized &&
      hasToken &&
      projects.length > 0 &&
      !isLoadingRef.current &&
      !hasLoadedInitialData.current
    ) {
      hasLoadedInitialData.current = true;
      // Небольшая задержка для готовности UI
      setTimeout(loadAllData, 500);
    }
  }, [isInitialized, hasToken, loadAllData, projects.length]);

  // Определяем, загружается ли какой-либо проект
  const anyProjectLoading = useMemo(() => projects.some(project => project.isLoading), [projects]);

  // Мемоизация списка проектов для предотвращения перерисовок
  const projectsList = useMemo(() => {
    return projects.map(project => (
      <div key={project.id} className="mb-10">
        <DataTable
          columns={columns}
          data={project.data}
          error={project.error}
          onRefresh={() => loadProjectData(project.id)}
          lastUpdated={project.lastUpdated}
          actionRequiredUpdateTime={lastActionRequiredUpdate}
          isLoading={project.isLoading}
          tableId={`project-${project.id}`}
          projectName={project.name}
        />
      </div>
    ));
  }, [projects, columns, lastActionRequiredUpdate, loadProjectData]);

  // Пока не инициализированы, показываем загрузку
  if (!isInitialized) {
    return (
      <div className="container py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  // Если нет токена, просим добавить
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

  // Если нет проектов, предлагаем добавить
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

  // Основной контент
  return (
    <>
      <div className="flex justify-end items-center p-4 gap-2">
        <RefreshControls
          isLoading={anyProjectLoading}
          autoRefresh={autoRefresh}
          nextRefreshTime={nextAutoRefresh}
          onRefresh={loadAllData}
          onAutoRefreshChange={handleAutoRefreshChange}
        />
        <ThemeToggle />
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projects">
            <Server className="h-5 w-5" />
            <span className="sr-only">Projects</span>
          </Link>
        </Button>
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <Settings className="h-5 w-5" />
            <span className="sr-only">Settings</span>
          </Link>
        </Button>
      </div>
      <div className="container py-10">{projectsList}</div>
    </>
  );
}

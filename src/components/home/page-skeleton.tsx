import { useId } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Конфігурація скелетону - легко налаштовувана
const SKELETON_CONFIG = {
  projectCount: 3,
  headerItems: 6,
  rowItems: [1, 2, 1], // Кількість рядків для кожного проекту
  headerWidths: ['w-32', 'w-28', 'w-36'], // Ширини заголовків для кожного проекту
  footerWidths: ['w-24', 'w-20', 'w-16'], // Ширини футерів для кожного проекту
  titleWidths: ['w-48', 'w-56', 'w-40'], // Ширини заголовків проектів
};

// Компонент заголовка
function HeaderSkeleton() {
  return (
    <div className="flex justify-end items-center p-4 gap-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );
}

// Компонент скелетону заголовка таблиці
function TableHeaderSkeleton({ projectIndex }: { projectIndex: number }) {
  const headerWidth = SKELETON_CONFIG.headerWidths[projectIndex] || 'w-32';
  const footerWidth = SKELETON_CONFIG.footerWidths[projectIndex] || 'w-24';

  return (
    <div className="border-b p-4">
      <div className="flex justify-between items-center">
        <Skeleton className={`h-5 ${headerWidth}`} />
        <Skeleton className={`h-4 ${footerWidth}`} />
      </div>
    </div>
  );
}

// Компонент скелетону рядка таблиці
function TableRowSkeleton({
  baseId,
  projectIndex,
  rowIndex,
}: {
  baseId: string;
  projectIndex: number;
  rowIndex: number;
}) {
  return (
    <div
      key={`${baseId}-skeleton-row-${projectIndex + 1}-${rowIndex}`}
      className="grid grid-cols-6 gap-4 p-4 border-b"
    >
      {Array.from({ length: SKELETON_CONFIG.headerItems }).map((_, colIndex) => (
        <Skeleton
          key={`${baseId}-skeleton-cell-${projectIndex + 1}-${rowIndex}-${colIndex}`}
          className="h-4 w-full"
        />
      ))}
    </div>
  );
}

// Компонент скелетону заголовків таблиці
function TableHeadersSkeleton({ baseId, projectIndex }: { baseId: string; projectIndex: number }) {
  return (
    <div className="grid grid-cols-6 gap-4 p-4 border-b">
      {Array.from({ length: SKELETON_CONFIG.headerItems }).map((_, i) => (
        <Skeleton
          key={`${baseId}-skeleton-header-${projectIndex + 1}-${i}`}
          className="h-4 w-full"
        />
      ))}
    </div>
  );
}

// Компонент скелетону проекту
function ProjectSkeleton({ baseId, projectIndex }: { baseId: string; projectIndex: number }) {
  const rowCount = SKELETON_CONFIG.rowItems[projectIndex] || 1;
  const titleWidth = SKELETON_CONFIG.titleWidths[projectIndex] || 'w-48';

  return (
    <div className="space-y-4">
      {/* Заголовок проекту */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-sm" />
          <Skeleton className={`h-6 ${titleWidth}`} />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Скелетон таблиці */}
      <div className="border rounded-lg">
        <TableHeaderSkeleton projectIndex={projectIndex} />
        <div className="p-0">
          <TableHeadersSkeleton baseId={baseId} projectIndex={projectIndex} />
          {Array.from({ length: rowCount }).map((_, rowIndex) => (
            <TableRowSkeleton
              key={`${baseId}-project-${projectIndex + 1}-row-${rowIndex}`}
              baseId={baseId}
              projectIndex={projectIndex}
              rowIndex={rowIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  // Використовуємо useId для стабільних унікальних ключів
  const baseId = useId();

  return (
    <div className="min-h-screen bg-background">
      {/* Скелетон заголовка */}
      <HeaderSkeleton />

      {/* Скелетон проектів */}
      <div className="container py-10 pt-0">
        <div className="space-y-10">
          {Array.from({ length: SKELETON_CONFIG.projectCount }).map((_, projectIndex) => (
            <ProjectSkeleton
              // biome-ignore lint/suspicious/noArrayIndexKey: using index as key for skeleton items is acceptable
              key={`${baseId}-project-${projectIndex}`}
              baseId={baseId}
              projectIndex={projectIndex}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

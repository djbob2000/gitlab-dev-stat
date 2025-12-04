import { columns } from '@/components/common/columns';
import { DataTable } from '@/components/common/data-table/index';
import type { ProjectData } from '@/types';

interface ProjectsListProps {
  projects: ProjectData[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  return (
    <div className="space-y-6">
      {/* Individual project sections */}
      {projects.map((project) => (
        <div key={project.id}>
          {project.data.length > 0 && (
            <DataTable
              columns={columns}
              data={project.data}
              error={project.error}
              lastUpdated={project.lastUpdated}
              isLoading={project.isLoading}
              tableId={`project-${project.id}`}
              projectName={project.name}
            />
          )}
          {project.error && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              {project.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
import React from 'react';
import { DataTable } from '@/src/components/common/data-table';
import { columns } from '@/src/components/common/columns';
import { ProjectData, PROJECT_TABLE_ID_PREFIX } from '@/src/types/project-types';

interface ProjectsListProps {
  projects: ProjectData[];
  lastActionRequiredUpdate: Date;
  onRefreshProject: (projectId: number) => Promise<void>;
}

export function ProjectsList({
  projects,
  lastActionRequiredUpdate,
  onRefreshProject,
}: ProjectsListProps) {
  return projects.map(project => (
    <div key={project.id} className="mb-10">
      <DataTable
        columns={columns}
        data={project.data}
        error={project.error}
        onRefresh={() => onRefreshProject(project.id)}
        lastUpdated={project.lastUpdated}
        actionRequiredUpdateTime={lastActionRequiredUpdate}
        isLoading={project.isLoading}
        tableId={`${PROJECT_TABLE_ID_PREFIX}${project.id}`}
        projectName={project.name}
      />
    </div>
  ));
}

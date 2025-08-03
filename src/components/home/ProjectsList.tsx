import React from 'react';
import { DataTable } from '@/components/common/data-table/index';
import { columns } from '@/components/common/columns';
import { ProjectData } from '@/types';
import { PROJECT_TABLE_ID_PREFIX } from '@/constants/storage-keys';

interface ProjectsListProps {
  projects: ProjectData[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  return projects.map(project => (
    <div key={project.id} className="mb-10">
      <DataTable
        columns={columns}
        data={project.data}
        error={project.error}
        lastUpdated={project.lastUpdated}
        isLoading={project.isLoading}
        tableId={`${PROJECT_TABLE_ID_PREFIX}${project.id}`}
        projectName={project.name}
      />
    </div>
  ));
}

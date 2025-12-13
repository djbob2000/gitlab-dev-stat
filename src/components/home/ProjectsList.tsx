import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

import { columns } from '@/components/common/columns';
import { DataTable } from '@/components/common/data-table/index';
import type { ProjectData } from '@/types';

interface SortableProjectItemProps {
  project: ProjectData;
}

function SortableProjectItem({ project }: SortableProjectItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: project.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <DataTable
        columns={columns}
        data={project.data}
        error={project.error}
        lastUpdated={project.lastUpdated}
        isLoading={project.isLoading}
        tableId={`project-${project.id}`}
        projectName={project.name}
        dragHandle={
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:text-blue-500 active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Drag to reorder"
          >
            <GripVertical size={20} />
          </div>
        }
      />
      {project.error && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
          {project.error}
        </div>
      )}
    </div>
  );
}

interface ProjectsListProps {
  projects: ProjectData[];
  onReorder?: (newOrder: number[]) => void;
}

export function ProjectsList({ projects, onReorder }: ProjectsListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = projects.findIndex((p) => p.id === active.id);
      const newIndex = projects.findIndex((p) => p.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new array of IDs based on the move
        const newProjects = [...projects];
        const [movedProject] = newProjects.splice(oldIndex, 1);
        newProjects.splice(newIndex, 0, movedProject);

        const newOrder = newProjects.map((p) => p.id);
        onReorder(newOrder);
      }
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <div>
          {projects.map((project) => (
            <SortableProjectItem key={project.id} project={project} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

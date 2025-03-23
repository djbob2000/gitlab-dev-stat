'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Check, Users } from 'lucide-react';

// Тип для проекта GitLab
interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  description: string;
  web_url: string;
  avatar_url: string | null;
  star_count: number;
  last_activity_at: string;
  selected?: boolean;
}

interface ProjectCardProps {
  project: GitLabProject;
  onToggleSelect: (projectId: number) => void;
  onViewDevelopers: (projectId: number, projectName: string) => void;
}

export function ProjectCard({ project, onToggleSelect, onViewDevelopers }: ProjectCardProps) {
  return (
    <Card className={`overflow-hidden ${project.selected ? 'border-2 border-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold flex items-center">
              <div className="mr-2">
                <Checkbox
                  id={`project-${project.id}`}
                  checked={!!project.selected}
                  onCheckedChange={() => onToggleSelect(project.id)}
                />
              </div>
              {project.name}
            </CardTitle>
            <CardDescription className="mt-1">
              {project.description || 'No description'}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDevelopers(project.id, project.name)}
            className="ml-2 flex items-center"
          >
            <Users className="h-4 w-4 mr-1" />
            Developers
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="text-sm text-muted-foreground">
          <p>Last activity: {new Date(project.last_activity_at).toLocaleDateString()}</p>
          <p className="mt-1">Stars: {project.star_count}</p>
          <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
            <a
              href={project.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              View on GitLab
            </a>
            {project.selected && (
              <div className="flex items-center text-green-600">
                <Check className="h-4 w-4 mr-1" />
                <span>Selected for tracking</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

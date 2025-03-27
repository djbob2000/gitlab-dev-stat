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
// Type for GitLab project
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

// Type for GitLab developer
interface GitLabDeveloper {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
  access_level?: number;
  expires_at?: string | null;
  selected?: boolean;
}

interface ProjectCardProps {
  project: GitLabProject;
  onToggleSelect: (projectId: number) => void;
  onViewDevelopers: (projectId: number, projectName: string) => void;
  selectedDevelopers?: GitLabDeveloper[];
}

export function ProjectCard({
  project,
  onToggleSelect,
  onViewDevelopers,
  selectedDevelopers = [],
}: ProjectCardProps) {
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
            <CardDescription className="mt-1">{project.description || ''}</CardDescription>
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
          <div className="border-t border-border flex justify-between items-center pt-3">
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

          {project.selected && selectedDevelopers.length > 0 && (
            <div className="mt-3 border-t pt-2">
              <p className="text-sm font-medium mb-1">Selected Developers:</p>
              <ol className="pl-5 text-xs space-y-1">
                {selectedDevelopers.map((dev, index) => (
                  <li key={dev.id}>
                    {index + 1}. {dev.username}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

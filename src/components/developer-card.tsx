'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';

// Тип для разработчика GitLab
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

interface DeveloperCardProps {
  developer: GitLabDeveloper;
  onToggleSelect: (developerId: number) => void;
}

export function DeveloperCard({ developer, onToggleSelect }: DeveloperCardProps) {
  return (
    <Card className={developer.selected ? 'border-2 border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <img
              src={developer.avatar_url || '/placeholder-avatar.png'}
              alt={developer.name}
              className="h-10 w-10 rounded-full"
            />
          </div>
          <div>
            <CardTitle className="text-base">{developer.name}</CardTitle>
            <div className="text-sm text-muted-foreground">@{developer.username}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">
              {developer.access_level && (
                <div className="mt-1">Access Level: {developer.access_level}</div>
              )}
            </div>
            <a
              href={developer.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              GitLab Profile
            </a>
          </div>
          <div className="flex items-center">
            <Checkbox
              id={`dev-${developer.id}`}
              checked={!!developer.selected}
              onCheckedChange={() => onToggleSelect(developer.id)}
            />
            <label
              htmlFor={`dev-${developer.id}`}
              className="ml-2 text-sm font-medium cursor-pointer"
            >
              Track
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

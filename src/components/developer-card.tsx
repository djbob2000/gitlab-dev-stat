'use client';

import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

// Type for GitLab developer with exclusion support
interface GitLabDeveloper {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
  access_level?: number;
  expires_at?: string | null;
  // Support both legacy 'selected' and new 'excluded' properties
  selected?: boolean;
  excluded?: boolean;
}

interface DeveloperCardProps {
  developer: GitLabDeveloper;
  onToggleSelect: (developerId: number) => void;
}

export function DeveloperCard({ developer, onToggleSelect }: DeveloperCardProps) {
  const handleToggle = () => {
    onToggleSelect(developer.id);
  };

  // Determine exclusion status based on both legacy and new properties
  const isExcluded = developer.excluded !== undefined ? developer.excluded : !developer.selected;

  // Enhanced visual feedback for excluded developers
  const cardClass = isExcluded
    ? 'border-2 border-destructive/30 bg-muted/20 opacity-60 hover:opacity-80 transition-opacity'
    : 'border-2 border-primary bg-background hover:shadow-md transition-all';

  const checkboxChecked = !isExcluded;

  return (
    <Card
      className={cardClass}
      onClick={handleToggle}
      title={isExcluded ? 'Click to include in tracking' : 'Click to exclude from tracking'}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-full">
              <Image
                src={developer.avatar_url || '/placeholder-avatar.jpg'}
                alt={developer.name}
                width={40}
                height={40}
                className="w-full h-full object-cover select-none drag-none"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src =
                    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGM0Y0RjYiLz4KPHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSI0IiB5PSI0Ij4KPHBhdGggZD0iTTEyIDEyQzEyLjU1MjMgMTIgMTMgMTEuNTUyMyAxMyAxMFMxMy41NTIzIDEzIDEzIDEyVjE4QzEzIDE4LjQ0NzcgMTIuNTUyMyAxOSAxMiAxOUwxMCAyMUg0QzMuNDQ3NjkgMjEgMyAyMC41NTIzIDMgMjBWMjFDMyAyMS4yMzQ0IDMuMTAzNTggMjEuNDQ3NiAzLjIzNDE3IDIxLjU2MTNMMTEgMjNDMTEuNDQ3MyAyMyAxMiAyMi41NTIzIDEyIDIyQzEyIDIxLjQ0NzcgMTEuNTUyMyAyMSAxMiAyMVoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {developer.name}
                {isExcluded && <AlertCircle className="h-4 w-4 text-destructive" />}
              </CardTitle>
              <CardDescription className="text-xs">@{developer.username}</CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Checkbox
              id={`developer-${developer.id}`}
              checked={checkboxChecked}
              onCheckedChange={handleToggle}
            />
            {isExcluded && (
              <Badge variant="destructive" className="text-xs">
                Excluded
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-2 select-none">
          <a
            href={developer.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on GitLab
          </a>
        </div>
        <div className="flex flex-wrap gap-1 select-none">
          <Badge variant={developer.state === 'active' ? 'default' : 'secondary'}>
            {developer.state}
          </Badge>
          {isExcluded && (
            <Badge variant="outline" className="text-xs">
              Not tracked
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

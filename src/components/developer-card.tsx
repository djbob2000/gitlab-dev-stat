'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Badge } from '@/src/components/ui/badge';
import Image from 'next/image';

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

interface DeveloperCardProps {
  developer: GitLabDeveloper;
  onToggleSelect: (developerId: number) => void;
  selectedDevelopers?: GitLabDeveloper[];
}

export function DeveloperCard({
  developer,
  onToggleSelect,
  selectedDevelopers = [],
}: DeveloperCardProps) {
  const handleToggle = () => {
    onToggleSelect(developer.id);
  };

  return (
    <Card className={developer.selected ? 'border-2 border-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-full">
              <Image
                src={developer.avatar_url || '/placeholder-avatar.jpg'}
                alt={developer.name}
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <div>
              <CardTitle className="text-base">{developer.name}</CardTitle>
              <CardDescription className="text-xs">@{developer.username}</CardDescription>
            </div>
          </div>
          <Checkbox
            id={`developer-${developer.id}`}
            checked={developer.selected}
            onCheckedChange={handleToggle}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-2">
          <a
            href={developer.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            View on GitLab
          </a>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant={developer.state === 'active' ? 'default' : 'secondary'}>
            {developer.state}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

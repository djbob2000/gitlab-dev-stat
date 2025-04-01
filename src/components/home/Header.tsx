import React from 'react';
import { ThemeToggle } from '@/src/components/common/theme-toggle';
import { RefreshControls } from '@/src/components/common/refresh-controls';
import { Settings, Server } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import Link from 'next/link';

interface HeaderProps {
  isLoading: boolean;
  autoRefresh: boolean;
  nextRefreshTime: Date | null;
  onRefresh: () => Promise<void>;
  onAutoRefreshChange: (enabled: boolean) => void;
}

export function Header({
  isLoading,
  autoRefresh,
  nextRefreshTime,
  onRefresh,
  onAutoRefreshChange,
}: HeaderProps) {
  return (
    <div className="flex justify-end items-center p-4 gap-2">
      <RefreshControls
        isLoading={isLoading}
        autoRefresh={autoRefresh}
        nextRefreshTime={nextRefreshTime}
        onRefresh={onRefresh}
        onAutoRefreshChange={onAutoRefreshChange}
      />
      <ThemeToggle />
      <Button variant="ghost" size="icon" asChild>
        <Link href="/projects">
          <Server className="h-5 w-5" />
          <span className="sr-only">Projects</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <Link href="/settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Link>
      </Button>
    </div>
  );
}

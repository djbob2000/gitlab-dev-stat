'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table';
import { Input } from '@/src/components/ui/input';
import { Checkbox } from '@/src/components/ui/checkbox';
import { useTrackedDevelopers } from '@/src/hooks/use-tracked-developers';
import { useGitLabToken } from '@/src/hooks/use-gitlab-token';
import { Button } from '@/src/components/ui/button';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/src/components/ui/card';
import { toast } from 'sonner';
import { fetchWithToken } from '@/src/lib/api';
import { validateAndSetToken } from '../actions/token';
import { removeToken } from '../actions/token';

interface GitLabDeveloper {
  id: number;
  username: string;
  name?: string;
  avatar_url?: string;
  web_url?: string;
  access_level?: number;
  expires_at?: string | null;
}

interface ApiResponse {
  developers: GitLabDeveloper[];
  count: number;
  message?: string;
}

async function fetchProjectDevelopers(): Promise<GitLabDeveloper[]> {
  const response = await fetchWithToken<ApiResponse>('/api/gitlab/developers');
  return response.developers;
}

export default function DevelopersPage() {
  const { developers, updateDevelopers, toggleDeveloper, isInitialized } = useTrackedDevelopers();
  const { hasToken, updateToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const [search, setSearch] = useState('');
  const [isDevelopersLoading, setIsDevelopersLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRemovingToken, setIsRemovingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeDevelopers = async () => {
      if (!hasToken) return;

      try {
        setIsDevelopersLoading(true);
        setError(null);
        const data = await fetchProjectDevelopers();

        const updatedDevelopers = data.map(dev => ({
          userId: dev.id,
          username: dev.username,
          selected: developers.some(d => d.userId === dev.id && d.selected),
        }));

        updateDevelopers(updatedDevelopers);
      } catch (err) {
        let errorMessage = 'Failed to fetch developers.';

        if (err instanceof Error) {
          // Check for specific error messages
          if (
            err.message.includes('Project Not Found') ||
            err.message.includes('Project with ID')
          ) {
            errorMessage = `${err.message} Please check that your token has access to the specified project.`;
          } else if (err.message.includes('Invalid token')) {
            errorMessage =
              'Your GitLab token is invalid or expired. Please remove it and add a new token.';
          } else {
            errorMessage += ' ' + err.message;
          }
        }

        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsDevelopersLoading(false);
      }
    };

    if (isInitialized && !hasFetched && hasToken) {
      setHasFetched(true);
      initializeDevelopers();
    }
  }, [isInitialized, hasFetched, developers, updateDevelopers, hasToken]);

  // Filter developers based on search
  const filteredDevelopers = developers.filter(dev =>
    dev.username.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate selected count
  const selectedCount = developers.filter(dev => dev.selected).length;

  const handleSaveToken = async (token: string) => {
    setIsValidating(true);
    setError(null);
    try {
      const result = await validateAndSetToken(token);
      if (result.success) {
        setNewToken('');
        toast.success('GitLab token saved successfully');
        await updateToken(token);
        setHasFetched(false);
      } else {
        setError('Failed to validate token. Please check if the token is valid.');
      }
    } catch {
      setError('Failed to validate token. Please check if the token is valid.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveToken = async () => {
    setIsRemovingToken(true);
    setError(null);
    try {
      await removeToken();
      await updateToken(null);
      setHasFetched(false);
      updateDevelopers([]);
      toast.success('GitLab token removed successfully');
    } catch {
      setError('Failed to remove token.');
    } finally {
      setIsRemovingToken(false);
    }
  };

  if (!isInitialized || !isTokenInitialized) {
    return (
      <div className="container mx-auto py-10">
        <div className="mb-4 p-4 text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to dashboard</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your GitLab integration and tracked developers.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GitLab Token</CardTitle>
          <CardDescription>
            Manage your GitLab personal access token. This token is used to access the GitLab API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          {hasToken ? (
            <div>
              <p className="mb-4 text-green-600">GitLab token is set and valid.</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveToken}
                disabled={isRemovingToken}
              >
                {isRemovingToken ? 'Removing...' : 'Remove Token'}
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-4">Please add your GitLab token to access repository statistics.</p>
              <p className="mb-4 text-sm text-muted-foreground">
                You can generate a personal access token at{' '}
                <a
                  href="https://gitlab.com/-/user_settings/personal_access_tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline"
                >
                  GitLab User Settings page
                </a>
                . Make sure to grant <strong>api</strong> and <strong>read_api</strong> scopes.
              </p>
              <div className="flex items-center gap-4">
                <Input
                  type={showToken ? 'text' : 'password'}
                  placeholder="Enter your GitLab token"
                  value={newToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToken(e.target.value)}
                  className="max-w-md"
                />
                <Button variant="ghost" size="icon" onClick={() => setShowToken(!showToken)}>
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button onClick={() => handleSaveToken(newToken)} disabled={isValidating}>
                  {isValidating ? 'Validating...' : 'Save Token'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tracked Developers</CardTitle>
          <CardDescription>
            Select developers to track their activity in the analytics dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 py-4">
            <Input
              placeholder="Search developers..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <div className="ml-auto text-sm text-muted-foreground">
              {selectedCount} of {developers.length} developer(s) selected
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={developers.length > 0 && selectedCount === developers.length}
                      onCheckedChange={(checked: boolean) => {
                        updateDevelopers(
                          developers.map(dev => ({
                            ...dev,
                            selected: !!checked,
                          }))
                        );
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Username</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isDevelopersLoading ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      Loading developers from GitLab...
                    </TableCell>
                  </TableRow>
                ) : !hasToken ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      Please add a GitLab token to view developers
                    </TableCell>
                  </TableRow>
                ) : filteredDevelopers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="h-24 text-center">
                      No developers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevelopers.map(developer => (
                    <TableRow key={developer.username}>
                      <TableCell className="w-[50px] py-1">
                        <Checkbox
                          checked={developer.selected}
                          onCheckedChange={(checked: boolean) => toggleDeveloper(developer.userId)}
                          aria-label={`Select ${developer.username}`}
                        />
                      </TableCell>
                      <TableCell className="py-1">{developer.username}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

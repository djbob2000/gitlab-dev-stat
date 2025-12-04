'use client';

import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import React, { useActionState, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGitLabToken } from '@/hooks/use-gitlab-token';
import { removeToken, validateAndSetToken } from '../actions/token';

export default function DevelopersPage() {
  const { hasToken, updateToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isRemovingToken, setIsRemovingToken] = useState(false);

  // Token saving action using useActionState (React 19.3+)
  const [tokenError, saveTokenAction, isSavingToken] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      const token = formData.get('token') as string;

      if (!token || token.trim().length === 0) {
        return 'Token is required';
      }

      try {
        const result = await validateAndSetToken(token);
        if (result.success) {
          await updateToken(token);
          setNewToken('');
          toast.success('GitLab token saved successfully');
          return null;
        }
        return result.error || 'Failed to validate token. Please check if the token is valid.';
      } catch (_error) {
        return 'Failed to validate token. Please check if the token is valid.';
      }
    },
    null
  );

  // Show error toast when there's an action state error
  React.useEffect(() => {
    if (tokenError) {
      toast.error(tokenError);
    }
  }, [tokenError]);

  const handleRemoveToken = async () => {
    setIsRemovingToken(true);
    try {
      await removeToken();
      await updateToken(null);
      toast.success('GitLab token removed successfully');
    } catch {
      toast.error('Failed to remove token.');
    } finally {
      setIsRemovingToken(false);
    }
  };

  if (!isTokenInitialized) {
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
            <p className="text-sm text-muted-foreground">Manage your GitLab integration.</p>
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

              {/* Form using useActionState (React 19.3+) */}
              <form action={saveTokenAction} className="flex items-center gap-4">
                <Input
                  type={showToken ? 'text' : 'password'}
                  name="token"
                  placeholder="Enter your GitLab token"
                  value={newToken}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewToken(e.target.value)}
                  className="max-w-md"
                  disabled={isSavingToken}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  disabled={isSavingToken}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button type="submit" disabled={isSavingToken}>
                  {isSavingToken ? 'Validating...' : 'Save Token'}
                </Button>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

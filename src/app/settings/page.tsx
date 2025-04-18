'use client';

import { useState } from 'react';
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
import { Input } from '@/src/components/ui/input';
import { toast } from 'sonner';
import { validateAndSetToken } from '../actions/token';
import { removeToken } from '../actions/token';

export default function DevelopersPage() {
  const { hasToken, updateToken, isInitialized: isTokenInitialized } = useGitLabToken();
  const [newToken, setNewToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRemovingToken, setIsRemovingToken] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveToken = async (token: string) => {
    setIsValidating(true);
    setError(null);
    try {
      const result = await validateAndSetToken(token);
      if (result.success) {
        setNewToken('');
        toast.success('GitLab token saved successfully');
        await updateToken(token);
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
      toast.success('GitLab token removed successfully');
    } catch {
      setError('Failed to remove token.');
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
    </div>
  );
}

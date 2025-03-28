'use server';

import { cookies } from 'next/headers';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
  UNAUTHORIZED: 'Unauthorized or invalid token',
  UNKNOWN: 'Unknown GitLab API error',
};

/**
 * Validates a GitLab token by making a request to the GitLab API
 */
async function validateGitLabToken(token: string): Promise<boolean> {
  if (!process.env.GITLAB_BASE_URL) {
    throw new Error(GITLAB_API_ERROR.MISSING_URL);
  }

  try {
    const response = await fetch(`${process.env.GITLAB_BASE_URL}/api/v4/user`, {
      headers: { 'PRIVATE-TOKEN': token },
    });

    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Validates and stores a GitLab token in cookies
 */
export async function validateAndSetToken(token: string): Promise<{ success: boolean }> {
  try {
    const isValid = await validateGitLabToken(token);

    if (!isValid) {
      return { success: false };
    }

    // Store token directly in cookie without encryption
    const cookieStore = await cookies();
    cookieStore.set('gitlab-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 30 days
    });

    return { success: true };
  } catch (_error) {
    return { success: false };
  }
}

/**
 * Removes the GitLab token cookie
 */
export async function removeToken(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete('gitlab-token');
  return { success: true };
}

/**
 * Checks if a valid token exists
 */
export async function hasValidToken(): Promise<{ hasToken: boolean }> {
  const cookieStore = await cookies();
  const token = cookieStore.get('gitlab-token')?.value;

  if (!token) {
    return { hasToken: false };
  }

  try {
    const isValid = await validateGitLabToken(token);

    if (!isValid) {
      const cookieStore = await cookies();
      cookieStore.delete('gitlab-token');
      return { hasToken: false };
    }

    return { hasToken: true };
  } catch (_error) {
    const cookieStore = await cookies();
    cookieStore.delete('gitlab-token');
    return { hasToken: false };
  }
}

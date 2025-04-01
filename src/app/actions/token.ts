'use server';

import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/src/lib/crypto';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
  UNAUTHORIZED: 'Unauthorized or invalid token',
  UNKNOWN: 'Unknown GitLab API error',
  ENCRYPTION_FAILED: 'Failed to encrypt token',
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
 * Validates and stores an encrypted GitLab token in cookies
 */
export async function validateAndSetToken(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const isValid = await validateGitLabToken(token);

    if (!isValid) {
      return { success: false, error: GITLAB_API_ERROR.UNAUTHORIZED };
    }

    try {
      // Encrypt the token before storing in cookie
      const encryptedToken = await encrypt(token);

      // Store encrypted token in cookie
      const cookieStore = await cookies();
      cookieStore.set('gitlab-token', encryptedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to encrypt token:', error);
      return { success: false, error: GITLAB_API_ERROR.ENCRYPTION_FAILED };
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return { success: false, error: GITLAB_API_ERROR.UNKNOWN };
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
  const encryptedToken = cookieStore.get('gitlab-token')?.value;

  if (!encryptedToken) {
    return { hasToken: false };
  }

  try {
    // Decrypt the token
    const token = await decrypt(encryptedToken);

    if (!token) {
      cookieStore.delete('gitlab-token');
      return { hasToken: false };
    }

    const isValid = await validateGitLabToken(token);

    if (!isValid) {
      cookieStore.delete('gitlab-token');
      return { hasToken: false };
    }

    return { hasToken: true };
  } catch (error) {
    console.error('Token validation error:', error);
    cookieStore.delete('gitlab-token');
    return { hasToken: false };
  }
}

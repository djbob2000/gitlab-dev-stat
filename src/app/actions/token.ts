'use server';

import { cookies } from 'next/headers';
import { encrypt, decrypt } from '@/src/lib/crypto';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
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

    if (!response.ok) {
      const _errorData = await response.json().catch(() => ({ error: GITLAB_API_ERROR.UNKNOWN }));
      return false;
    }

    return true;
  } catch (_error) {
    return false;
  }
}

export async function validateAndSetToken(token: string) {
  try {
    const isValid = await validateGitLabToken(token);

    if (!isValid) {
      return { success: false };
    }

    const encryptedToken = await encrypt(token);

    // Set cookie on the server side
    const cookieStore = await cookies();
    cookieStore.set('gitlab-token', encryptedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });

    return { success: true };
  } catch (_error) {
    return { success: false };
  }
}

export async function removeToken() {
  const cookieStore = await cookies();
  cookieStore.delete('gitlab-token');
  return { success: true };
}

export async function hasValidToken() {
  const cookieStore = await cookies();
  const encryptedToken = cookieStore.get('gitlab-token')?.value;

  if (!encryptedToken) {
    return { hasToken: false };
  }

  try {
    const token = await decrypt(encryptedToken);

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

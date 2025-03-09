'use server';

import { cookies } from 'next/headers';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { encrypt, decrypt } from '@/src/lib/crypto';

export async function validateAndSetToken(token: string) {
  try {
    const client = createGitLabClient({
      baseUrl: process.env.GITLAB_BASE_URL!,
      token,
      projectPath: process.env.GITLAB_PROJECT_PATH!,
    });

    await client.getProjectMembers(Number(process.env.GITLAB_PROJECT_ID!));

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
    console.error('[Token] Error validating token:', _error);
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

    const client = createGitLabClient({
      baseUrl: process.env.GITLAB_BASE_URL!,
      token,
      projectPath: process.env.GITLAB_PROJECT_PATH!,
    });

    await client.getProjectMembers(Number(process.env.GITLAB_PROJECT_ID!));
    return { hasToken: true };
  } catch (_error) {
    console.error('[Token] Error validating token:', _error);
    const cookieStore = await cookies();
    cookieStore.delete('gitlab-token');
    return { hasToken: false };
  }
}

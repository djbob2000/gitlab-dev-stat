'use server';

import { cookies } from 'next/headers';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';

export async function validateAndSetToken(token: string) {
  try {
    // Test if token is valid by making a test API call
    const client = createGitLabClient({
      baseUrl: process.env.GITLAB_BASE_URL!,
      token,
      projectPath: process.env.GITLAB_PROJECT_PATH!,
    });

    // Try to get project members as a test
    await client.getProjectMembers(Number(process.env.GITLAB_PROJECT_ID!));

    // If we get here, token is valid
    const cookieStore = await cookies();
    console.log('Setting cookie with options:', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });
    cookieStore.set('gitlab-token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 365 days
    });
    return { success: true };
  } catch {
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
  const token = await cookieStore.get('gitlab-token')?.value;
  
  if (!token) {
    return { hasToken: false };
  }

  try {
    // Verify that the token is still valid
    const client = createGitLabClient({
      baseUrl: process.env.GITLAB_BASE_URL!,
      token,
      projectPath: process.env.GITLAB_PROJECT_PATH!,
    });

    await client.getProjectMembers(Number(process.env.GITLAB_PROJECT_ID!));
    return { hasToken: true };
  } catch {
    // If token is invalid, remove it
    await cookieStore.delete('gitlab-token');
    return { hasToken: false };
  }
} 
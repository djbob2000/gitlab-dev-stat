'use server';

import { unstable_noStore as noStore } from 'next/cache';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/crypto';
import type { GitLabProject } from '@/types/gitlab/projects';

export async function getUserProjects(): Promise<GitLabProject[]> {
  noStore(); // Prevent prerendering for cookie operations

  try {
    // Отримуємо зашифрований токен з cookies
    let encryptedToken = '';
    try {
      const cookieStore = await cookies();
      encryptedToken = cookieStore.get('gitlab-token')?.value || '';
    } catch (error) {
      // Handle cookies() error gracefully during prerendering
      console.warn('cookies() error during prerendering in getUserProjects:', error);
      return [];
    }
    
    // Якщо токен відсутній, повертаємо порожній масив
    if (!encryptedToken) {
      return [];
    }

    // Розшифровуємо токен (асинхронно)
    const decryptedToken = await decrypt(encryptedToken);
    
    // Якщо розшифровка не вдалася, повертаємо порожній масив
    if (!decryptedToken) {
      return [];
    }

    // Формуємо запит до GitLab API
    const baseUrl = process.env.GITLAB_BASE_URL;
    if (!baseUrl) {
      console.error('GITLAB_BASE_URL is not configured');
      return [];
    }

    const response = await fetch(`${baseUrl}/api/v4/projects?membership=true`, {
      method: 'GET',
      headers: {
        'PRIVATE-TOKEN': decryptedToken,
        'Content-Type': 'application/json',
      },
    });

    // Якщо запит неуспішний, повертаємо порожній масив
    if (!response.ok) {
      console.error('GitLab API request failed:', response.status, response.statusText);
      return [];
    }

    // Парсимо та повертаємо дані проектів
    const projects: GitLabProject[] = await response.json();
    return projects;
  } catch (error) {
    // Логуємо помилку та повертаємо порожній масив
    console.error('Error fetching user projects:', error);
    return [];
  }
}
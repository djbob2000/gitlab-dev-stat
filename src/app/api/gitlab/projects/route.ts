import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { decrypt } from '@/src/lib/crypto';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
  UNKNOWN: 'Unknown GitLab API error',
};

// Define the GitLab project type
interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  path: string;
  path_with_namespace: string;
  description: string;
  web_url: string;
  avatar_url: string | null;
  star_count: number;
  last_activity_at: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
    full_path: string;
  };
  visibility: string;
}

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

/**
 * Fetches projects accessible by the user from GitLab API
 * Handles pagination to get all projects
 */
async function fetchUserProjects(token: string): Promise<GitLabProject[]> {
  if (!process.env.GITLAB_BASE_URL) {
    throw new Error(GITLAB_API_ERROR.MISSING_URL);
  }

  // Array to store all projects from all pages
  let allProjects: GitLabProject[] = [];
  let page = 1;
  const perPage = 100; // Maximum allowed by GitLab API

  // Ограничиваем запрос только первой страницей (100 проектов)
  // В будущем можно реализовать пагинацию на frontend
  const maxPages = 1;

  console.log(
    `Limiting projects to first ${maxPages} page(s) (max ${maxPages * perPage} projects)`
  );

  // Fetch pages
  while (page <= maxPages) {
    const url = `${process.env.GITLAB_BASE_URL}/api/v4/projects?page=${page}&per_page=${perPage}&order_by=last_activity_at&sort=desc&visibility=private`;
    console.log(`Fetching GitLab projects, page ${page}:`, url);

    // Создаем контроллер AbortController для таймаута
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут

    try {
      const response = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': token },
        signal: controller.signal,
      });

      // Очищаем таймаут после завершения запроса
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: GITLAB_API_ERROR.UNKNOWN }));
        throw new Error(`Failed to fetch projects: ${errorData.message || 'Unknown error'}`);
      }

      // Get the current page of projects
      const projects = (await response.json()) as GitLabProject[];
      console.log(`Received ${projects.length} projects on page ${page}`);

      // Add projects to our result array
      allProjects = [...allProjects, ...projects];

      // Check if we've reached the last page or if there are no more projects
      if (projects.length < perPage) {
        break;
      } else {
        page++;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('Request timed out after 10 seconds');
        // Если истек таймаут, прекращаем попытки
        break;
      } else {
        throw error;
      }
    }
  }

  console.log(`Total projects fetched: ${allProjects.length}`);
  return allProjects;
}

type ApiResponse = {
  projects: GitLabProject[];
  count: number;
  message: string;
};

type ApiErrorResponse = {
  error: string;
  detail?: string;
};

// Next.js 14/15 использует именованные экспорты для API роутов
export async function GET(request: Request) {
  console.log('API endpoint /api/gitlab/projects called with Next.js 14/15 handler');
  try {
    // Get token from header
    const headersList = await headers();
    const encryptedToken = headersList.get('x-gitlab-token-encrypted');
    console.log('Encrypted token present:', !!encryptedToken);

    if (!encryptedToken) {
      console.log('No token found in headers');
      return NextResponse.json({ error: 'GitLab token is required' } as ApiErrorResponse, {
        status: 401,
      });
    }

    try {
      // Decrypt the token
      console.log('Decrypting token...');
      // Декодируем токен, так как он закодирован в URL-формате в cookie
      const decodedToken = decodeURIComponent(encryptedToken);
      console.log('Token decoded successfully');
      const token = await decrypt(decodedToken);
      console.log('Token decrypted successfully');

      // Validate the token
      console.log('Validating token...');
      const isValid = await validateGitLabToken(token);
      console.log('Token validation result:', isValid);

      if (!isValid) {
        console.log('Token validation failed');
        return NextResponse.json(
          {
            error: 'Invalid token',
            detail: 'Token validation with GitLab API failed',
          } as ApiErrorResponse,
          { status: 401 }
        );
      }

      // Fetch the projects with the validated token
      console.log('Fetching projects...');
      const projects = await fetchUserProjects(token);
      console.log(`Found ${projects.length} projects`);

      if (projects.length === 0) {
        console.log('No projects were found - returning empty array');
      } else {
        console.log('First project:', JSON.stringify(projects[0]));
      }

      // Return the projects with a count
      const response = {
        projects,
        count: projects.length,
        message: 'Successfully retrieved user projects',
      } as ApiResponse;

      // Логируем полный ответ (лимитированный для экономии места в логах)
      console.log('Sending response:', JSON.stringify(response).substring(0, 200) + '...');

      return NextResponse.json(response, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    } catch (error) {
      console.error('Error processing request:', error);
      return NextResponse.json(
        {
          error: 'Invalid token',
          detail: error instanceof Error ? error.message : 'Unknown error',
        } as ApiErrorResponse,
        { status: 401 }
      );
    }
  } catch (_error) {
    console.error('Unexpected error in API route:', _error);
    return NextResponse.json({ error: 'Internal server error' } as ApiErrorResponse, {
      status: 500,
    });
  }
}

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
  UNKNOWN: 'Unknown GitLab API error',
};

// Define the GitLab developer type
interface GitLabDeveloper {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
  access_level: number;
  expires_at: string | null;
}

// Define the GitLab project type
interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
}

// API response types
interface ApiResponse {
  developers: GitLabDeveloper[];
  count: number;
  message: string;
  projectName: string;
  projectPath: string;
}

interface ApiErrorResponse {
  error: string;
  detail?: string;
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

    return response.ok;
  } catch (_error) {
    return false;
  }
}

/**
 * Fetches project members directly from GitLab API
 * Handles pagination to get all members
 */
async function fetchProjectMembers(
  token: string,
  projectId: string
): Promise<{ developers: GitLabDeveloper[]; projectName: string; projectPath: string }> {
  if (!process.env.GITLAB_BASE_URL) {
    throw new Error(GITLAB_API_ERROR.MISSING_URL);
  }

  // Array to store all members
  let allMembers: GitLabDeveloper[] = [];
  let projectName = '';
  let projectPath = '';

  // First, get the project details to get the name
  try {
    const projectUrl = `${process.env.GITLAB_BASE_URL}/api/v4/projects/${projectId}`;

    const projectResponse = await fetch(projectUrl, {
      headers: { 'PRIVATE-TOKEN': token },
    });

    if (projectResponse.ok) {
      const projectData = (await projectResponse.json()) as GitLabProject;
      projectName = projectData.name;
      projectPath = projectData.path_with_namespace;
    }
  } catch (error) {
    console.error('Error fetching project details:', error);
  }

  // Now get the project members
  let page = 1;
  const perPage = 100; // Maximum allowed by GitLab API
  let hasMorePages = true;

  while (hasMorePages) {
    const url = `${process.env.GITLAB_BASE_URL}/api/v4/projects/${projectId}/members?page=${page}&per_page=${perPage}`;

    try {
      const response = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': token },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: GITLAB_API_ERROR.UNKNOWN }));
        throw new Error(`Failed to fetch members: ${errorData.message || 'Unknown error'}`);
      }

      const members = (await response.json()) as GitLabDeveloper[];
      allMembers = [...allMembers, ...members];

      // Check if we've reached the last page
      if (members.length < perPage) {
        hasMorePages = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error('Error fetching project members:', error);
      hasMorePages = false;
    }
  }

  return {
    developers: allMembers,
    projectName,
    projectPath,
  };
}

export async function GET(request: Request, context: { params: { projectId: string } }) {
  const projectId = context.params.projectId;

  try {
    // Get token from header (added by middleware)
    const headersList = await headers();
    const token = headersList.get('X-GitLab-Token');

    if (!token) {
      return NextResponse.json({ error: 'GitLab token is required' } as ApiErrorResponse, {
        status: 401,
      });
    }

    try {
      // Validate the token
      const isValid = await validateGitLabToken(token);

      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Invalid token',
            detail: 'Token validation with GitLab API failed',
          } as ApiErrorResponse,
          { status: 401 }
        );
      }

      // Fetch the project members with the validated token
      const { developers, projectName, projectPath } = await fetchProjectMembers(token, projectId);

      // Return the developers with a count
      const response = {
        developers,
        count: developers.length,
        message: 'Successfully retrieved project members',
        projectName,
        projectPath,
      } as ApiResponse;

      return NextResponse.json(response);
    } catch (error) {
      console.error('Error processing request:', error);
      return NextResponse.json(
        {
          error: 'Invalid token or project',
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

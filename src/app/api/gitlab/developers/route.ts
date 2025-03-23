import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { decrypt } from '@/src/lib/crypto';

// GitLab API Error constants
const GITLAB_API_ERROR = {
  MISSING_URL: 'GitLab base URL is not defined',
  UNKNOWN: 'Unknown GitLab API error',
};

// Define the GitLab member type for better type safety
interface GitLabMember {
  id: number;
  username: string;
  name: string;
  state: string;
  avatar_url: string;
  web_url: string;
  access_level: number;
  expires_at: string | null;
}

// Environment variables validation
const requiredEnvVars = ['GITLAB_BASE_URL', 'GITLAB_PROJECT_ID'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
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
 * Fetches project members directly from GitLab API
 * Handles pagination to get all members
 */
async function fetchProjectMembers(token: string): Promise<GitLabMember[]> {
  // We need to use a project ID for getting project members
  const projectId = process.env.GITLAB_PROJECT_ID;

  if (!projectId) {
    throw new Error('GITLAB_PROJECT_ID environment variable is not defined');
  }

  // Array to store all members from all pages
  let allMembers: GitLabMember[] = [];
  let page = 1;
  const perPage = 100; // Maximum allowed by GitLab API
  let hasMorePages = true;

  // Fetch all pages
  while (hasMorePages) {
    const url = `${process.env.GITLAB_BASE_URL}/api/v4/projects/${projectId}/members?page=${page}&per_page=${perPage}`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': token },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: GITLAB_API_ERROR.UNKNOWN }));

      if (response.status === 404) {
        throw new Error(
          `Project with ID ${projectId} not found. Please check your GITLAB_PROJECT_ID environment variable.`
        );
      }

      throw new Error(`Failed to fetch project members: ${errorData.message || 'Unknown error'}`);
    }

    // Get the current page of members
    const members = (await response.json()) as GitLabMember[];

    // Add members to our result array
    allMembers = [...allMembers, ...members];

    // Check if we've reached the last page
    if (members.length < perPage) {
      hasMorePages = false;
    } else {
      page++;
    }
  }

  return allMembers;
}

type ApiResponse = {
  developers: GitLabMember[];
  count: number;
  message: string;
};

type ApiErrorResponse = {
  error: string;
  detail?: string;
};

export async function GET() {
  try {
    // Get token from header
    const headersList = await headers();
    const encryptedToken = headersList.get('x-gitlab-token-encrypted');

    if (!encryptedToken) {
      return NextResponse.json({ error: 'GitLab token is required' } as ApiErrorResponse, {
        status: 401,
      });
    }

    try {
      // Decrypt the token
      const token = await decrypt(encryptedToken);

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
      const developers = await fetchProjectMembers(token);

      // Return the developers with a count
      return NextResponse.json({
        developers,
        count: developers.length,
        message: 'Successfully retrieved project members',
      } as ApiResponse);
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid token',
          detail: error instanceof Error ? error.message : 'Unknown error',
        } as ApiErrorResponse,
        { status: 401 }
      );
    }
  } catch (_error) {
    return NextResponse.json({ error: 'Internal server error' } as ApiErrorResponse, {
      status: 500,
    });
  }
}

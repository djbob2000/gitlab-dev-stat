import { NextResponse } from 'next/server';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';

// Environment variables validation
const requiredEnvVars = ['GITLAB_TOKEN', 'GITLAB_PROJECT_ID', 'GITLAB_BASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// GitLab client initialization
const gitlabClient = createGitLabClient({
  baseUrl: process.env.GITLAB_BASE_URL!,
  token: process.env.GITLAB_TOKEN!,
});

export async function GET() {
  try {
    const projectId = process.env.GITLAB_PROJECT_ID!;
    const developers = await gitlabClient.getProjectMembers(Number(projectId));
    
    return NextResponse.json(developers);
  } catch (error) {
    console.error('Error fetching project developers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
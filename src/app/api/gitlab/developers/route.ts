import { NextResponse } from 'next/server';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { headers } from 'next/headers';
import { decrypt } from '@/src/lib/crypto';

// Environment variables validation
const requiredEnvVars = ['GITLAB_PROJECT_ID', 'GITLAB_BASE_URL', 'GITLAB_PROJECT_PATH'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

export async function GET() {
  try {
    // Пытаемся получить токен из заголовка
    const headersList = await headers();

    const encryptedToken = headersList.get('x-gitlab-token-encrypted');

    if (!encryptedToken) {
      return NextResponse.json({ error: 'GitLab token is required' }, { status: 401 });
    }

    try {
      const token = await decrypt(encryptedToken);

      // GitLab client initialization with the decrypted token
      const gitlabClient = createGitLabClient({
        baseUrl: process.env.GITLAB_BASE_URL!,
        token,
        projectPath: process.env.GITLAB_PROJECT_PATH!,
      });

      const projectId = process.env.GITLAB_PROJECT_ID!;

      const developers = await gitlabClient.getProjectMembers(Number(projectId));

      return NextResponse.json(developers);
    } catch (error) {
      console.error('[API] Error decrypting token or fetching data:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

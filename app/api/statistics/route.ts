import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { calculateBulkIssuesTimeStats } from '@/src/tasks/time-calculation.task';

// Environment variables validation
const requiredEnvVars = [
  'GITLAB_TOKEN',
  'GITLAB_PROJECT_ID',
  'GITLAB_BASE_URL',
  'GITLAB_PROJECT_PATH'
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// GitLab client initialization
const gitlabClient = createGitLabClient({
  baseUrl: process.env.GITLAB_BASE_URL!,
  token: process.env.GITLAB_TOKEN!,
  projectPath: process.env.GITLAB_PROJECT_PATH!,
});

// Validation schema for GET request
const getStatisticsSchema = z.object({
  usernames: z.string().transform(str => str.split(',')),
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usernames = searchParams.get('usernames');
    const projectId = searchParams.get('projectId') || process.env.GITLAB_PROJECT_ID;

    if (!usernames) {
      return NextResponse.json(
        { error: 'Usernames parameter is required' },
        { status: 400 }
      );
    }

    // Validate and parse parameters
    const validatedData = getStatisticsSchema.parse({
      usernames,
      projectId,
    });

    // Get issues for each developer
    const issues = await gitlabClient.getProjectIssues(
      Number(validatedData.projectId),
      validatedData.usernames
    );

    // Calculate time statistics for all issues
    const timeStats = calculateBulkIssuesTimeStats(issues);

    // Create a map of issue ID to time stats for quick lookup
    const timeStatsMap = new Map(
      issues.map((issue, index) => [issue.id, timeStats[index]])
    );

    // Create flat list of issues with statistics
    const issueStats = await Promise.all(issues.map(async issue => {
      const stats = timeStatsMap.get(issue.id);
      const timeInProgress = stats ? stats.totalDuration : 0;
      const totalTimeFromStart = issue.totalTimeFromStart;

      // Fetch related merge requests and their labels
      const mergeRequests = await gitlabClient.getIssueRelatedMergeRequests(
        Number(validatedData.projectId),
        issue.iid
      );
      const mergeRequestLabels = mergeRequests
        .filter(mr => mr.state === 'opened')
        .filter(mr => mr.title.startsWith(`${issue.iid}`))
        .map(mr => ({
          mrIid: mr.iid,
          labels: mr.labels,
          url: `${process.env.GITLAB_BASE_URL}/${process.env.GITLAB_PROJECT_PATH}/-/merge_requests/${mr.iid}`,
          title: mr.title
        }));

      return {
        id: issue.id,
        iid: issue.iid,
        title: issue.title || `Issue #${issue.iid}`,
        timeInProgress,
        totalTimeFromStart,
        url: `${process.env.GITLAB_BASE_URL}/${process.env.GITLAB_PROJECT_PATH}/-/issues/${issue.iid}`,
        labels: issue.labels || [],
        username: issue.assignee?.username || '-',
        mergeRequestLabels,
      };
    }));

    return NextResponse.json(issueStats);
  } catch (error) {
    console.error('Error in statistics route:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 
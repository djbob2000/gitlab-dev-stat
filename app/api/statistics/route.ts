import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient, IssueWithEvents } from '@/src/tasks/gitlab-api.task';

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
  usernames: z.string().transform(str => str.split(',')).nullish(),
  userIds: z.string().transform(str => str.split(',').map(Number)).nullish(),
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const usernames = searchParams.get('usernames');
    const userIds = searchParams.get('userIds');
    const projectId = searchParams.get('projectId') || process.env.GITLAB_PROJECT_ID;

    if (!usernames && !userIds) {
      return NextResponse.json(
        { error: 'Either usernames or userIds parameter is required' },
        { status: 400 }
      );
    }

    // Validate and parse parameters
    const validatedData = getStatisticsSchema.parse({
      usernames,
      userIds,
      projectId,
    });

    // Get issues for each developer
    let issues: IssueWithEvents[] = [];
    if (validatedData.userIds && validatedData.userIds.length > 0) {
      // If user IDs are provided, use them directly
      issues = await gitlabClient.getProjectIssues(
        Number(validatedData.projectId),
        undefined,
        validatedData.userIds
      );
    } else if (validatedData.usernames && validatedData.usernames.length > 0) {
      // If only usernames are provided, use them
      issues = await gitlabClient.getProjectIssues(
        Number(validatedData.projectId),
        validatedData.usernames
      );
    }

    // Create flat list of issues with statistics
    const issueStats = await Promise.all(issues.map(async issue => {
      const timeInProgress = issue.inProgressDuration;
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
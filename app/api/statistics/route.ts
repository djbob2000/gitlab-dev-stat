import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { calculateBulkIssuesTimeStats, formatDuration } from '@/src/tasks/time-calculation.task';
import type { DeveloperStatistics } from '@/lib/types';

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

    // Calculate time statistics
    const timeStats = calculateBulkIssuesTimeStats(issues);

    // Group statistics by developer
    const developerStats: DeveloperStatistics[] = validatedData.usernames.map(username => {
      const developerIssues = issues.filter(
        issue => issue.assignee?.username === username
      );

      const issueStats = developerIssues.map((issue, index) => ({
        id: issue.id,
        iid: issue.iid,
        title: issue.title || `Issue #${issue.iid}`,
        timeInProgress: timeStats[index].totalDuration,
        formattedTimeInProgress: formatDuration(timeStats[index].totalDuration),
        url: `${process.env.GITLAB_BASE_URL}/issues/${issue.iid}`,
      }));

      const totalTimeInProgress = issueStats.reduce(
        (total, issue) => total + issue.timeInProgress,
        0
      );

      const avgTimePerIssue = issueStats.length > 0 
        ? totalTimeInProgress / issueStats.length 
        : 0;

      return {
        username,
        totalTimeInProgress,
        formattedTimeInProgress: formatDuration(totalTimeInProgress),
        issuesCount: issueStats.length,
        issues: issueStats,
        avgTimePerIssue,
        formattedAvgTime: formatDuration(avgTimePerIssue),
      };
    });

    return NextResponse.json(developerStats);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
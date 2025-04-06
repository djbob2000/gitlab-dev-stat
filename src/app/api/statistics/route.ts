import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { headers } from 'next/headers';
import { LABELS } from '@/src/constants/labels';
import type {
  GitLabApiEvent,
  GitLabApiMergeRequest,
  BatchProcessor,
  MergeRequestWithStats,
} from '@/src/types/gitlab';

// Validation schema for GET request
const getStatisticsSchema = z.object({
  usernames: z
    .string()
    .transform(str => str.split(','))
    .nullish(),
  userIds: z
    .string()
    .transform(str => str.split(',').map(Number))
    .nullish(),
  projectId: z.string(),
  projectPath: z.string().optional(),
});

// Utility function to process issues in batches
const processBatch = async <T, R>(
  items: T[],
  batchSize: number = 99,
  fn: BatchProcessor<T, R>
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    // Add a small delay between batches to prevent rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  return results;
};

// Process merge request labels with optimized parallel requests
const processMergeRequestLabels = async (
  gitlabClient: ReturnType<typeof createGitLabClient>,
  projectId: number,
  projectPath: string,
  mergeRequests: GitLabApiMergeRequest[]
): Promise<MergeRequestWithStats[]> => {
  // Use a larger batch size for merge requests since they're less resource intensive
  return processBatch(mergeRequests, 25, async (mr: GitLabApiMergeRequest) => {
    const actionRequiredLabels = mr.labels.filter(
      label =>
        label === LABELS.ACTION_REQUIRED ||
        label === LABELS.ACTION_REQUIRED2 ||
        label === LABELS.ACTION_REQUIRED3
    );

    let actionRequiredLabelTime: number | undefined = undefined;
    let statusUpdateCommitCount: number | undefined = undefined;
    let labelEvents: GitLabApiEvent[] = [];

    const needsLabelEvents =
      actionRequiredLabels.length > 0 || mr.labels.includes(LABELS.STATUS_UPDATE_COMMIT);

    if (needsLabelEvents) {
      labelEvents = await gitlabClient.getMergeRequestLabelEvents(projectId, mr.iid);
    }

    if (actionRequiredLabels.length > 0) {
      const latestAddTime = actionRequiredLabels.reduce(
        (latest: number | undefined, label: string) => {
          const addEvents = labelEvents.filter(
            event => event.action === 'add' && event.label?.name === label
          );

          if (addEvents.length === 0) return latest;

          const addTime = Math.max(...addEvents.map(event => new Date(event.created_at).getTime()));

          return !latest ? addTime : Math.max(latest, addTime);
        },
        undefined
      );

      actionRequiredLabelTime = latestAddTime;
    }

    if (mr.labels.includes(LABELS.STATUS_UPDATE_COMMIT)) {
      statusUpdateCommitCount = labelEvents.filter(
        event => event.action === 'add' && event.label?.name === LABELS.STATUS_UPDATE_COMMIT
      ).length;
    }

    return {
      mrIid: mr.iid,
      labels: mr.labels,
      url: mr.web_url,
      title: mr.title,
      actionRequiredLabelTime,
      statusUpdateCommitCount,
    };
  });
};

export async function GET(request: Request) {
  try {
    // Environment variables validation
    const requiredEnvVars = ['GITLAB_BASE_URL'];
    const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        { error: `Missing required environment variables: ${missingEnvVars.join(', ')}` },
        { status: 500 }
      );
    }

    const headersList = await headers();
    const token = headersList.get('x-gitlab-token');

    if (!token) {
      console.error('API: No token found in headers');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const { searchParams } = new URL(request.url);
      const validatedData = getStatisticsSchema.parse({
        usernames: searchParams.get('usernames'),
        userIds: searchParams.get('userIds'),
        projectId: searchParams.get('projectId') || process.env.GITLAB_PROJECT_ID,
        projectPath: searchParams.get('projectPath') || process.env.GITLAB_PROJECT_PATH,
      });

      const projectId = Number(validatedData.projectId);
      const projectPath = validatedData.projectPath;

      if (!projectPath) {
        return NextResponse.json({ error: 'Project path is required' }, { status: 400 });
      }

      const gitlabClient = createGitLabClient({
        baseUrl: process.env.GITLAB_BASE_URL!,
        token,
        projectPath,
      });

      const issues = await gitlabClient.getProjectIssues(
        projectId,
        validatedData.usernames ?? undefined,
        validatedData.userIds ?? undefined
      );

      // Process issues in optimized batches
      const issueStats = await processBatch(issues, 5, async issue => {
        const timeInProgress = issue.inProgressDuration;
        const totalTimeFromStart = issue.totalTimeFromStart;

        // Get merge requests for the current issue
        const mergeRequests = (
          await gitlabClient.getIssueRelatedMergeRequests(projectId, issue.iid)
        ).filter(mr => mr.source_project_id === projectId && mr.state === 'opened');

        // Process merge request labels in parallel with optimized batching
        const mergeRequestLabels = await processMergeRequestLabels(
          gitlabClient,
          projectId,
          projectPath,
          mergeRequests
        );

        // Calculate the latest action required time across all MRs
        const actionRequiredTime = mergeRequestLabels.reduce(
          (latest, mr) =>
            mr.actionRequiredLabelTime && (!latest || mr.actionRequiredLabelTime > latest)
              ? mr.actionRequiredLabelTime
              : latest,
          undefined as number | undefined
        );

        return {
          id: issue.id,
          iid: issue.iid,
          title: issue.title,
          assignee: issue.assignee,
          labels: issue.labels,
          timeInProgress,
          totalTimeFromStart,
          mergeRequests: mergeRequestLabels,
          actionRequiredTime,
          url: `${process.env.GITLAB_BASE_URL}/${projectPath}/-/issues/${issue.iid}`,
        };
      });

      return NextResponse.json(issueStats);
    } catch (error) {
      console.error('[API] Error fetching data:', error);
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

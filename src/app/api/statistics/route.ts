import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LABELS } from '@/constants/labels';
import { createGitLabClient } from '@/tasks/gitlab-api.task';
import type {
  BatchProcessor,
  GitLabApiEvent,
  GitLabApiMergeRequest,
  MergeRequestWithStats,
} from '@/types/gitlab';


// Validation schema for GET request
const getStatisticsSchema = z.object({
  usernames: z
    .string()
    .transform((str) => str.split(','))
    .nullish(),
  userIds: z
    .string()
    .transform((str) => str.split(',').map(Number))
    .nullish(),
  projectId: z.string(),
  projectPath: z.string().optional(),
});

// Gitlab API has limit of 100 items per request
const BATCH_SIZE = 99;

// Utility function to process issues in batches
const processBatch = async <T, R>(
  items: T[],
  fn: BatchProcessor<T, R>,
  batchSize: number = BATCH_SIZE
): Promise<R[]> => {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);

    // Add a small delay between batches to prevent rate limiting
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return results;
};

// Optimized batch processing for merge request labels
const processMergeRequestLabels = async (
  gitlabClient: ReturnType<typeof createGitLabClient>,
  projectId: number,
  mergeRequests: GitLabApiMergeRequest[]
): Promise<MergeRequestWithStats[]> => {
  if (mergeRequests.length === 0) return [];

  // Filter MRs that need label events processing
  const mrsNeedingEvents = mergeRequests.filter((mr) => {
    const actionRequiredLabels = mr.labels.filter(
      (label) =>
        label === LABELS.ACTION_REQUIRED ||
        label === LABELS.ACTION_REQUIRED2 ||
        label === LABELS.ACTION_REQUIRED3
    );
    return actionRequiredLabels.length > 0 || mr.labels.includes(LABELS.STATUS_UPDATE_COMMIT);
  });

  // Batch fetch label events for all MRs that need them
  const labelEventsPromises = mrsNeedingEvents.map(async (mr) => {
    try {
      const events = await gitlabClient.getMergeRequestLabelEvents(projectId, mr.iid);
      return { mrIid: mr.iid, events };
    } catch (error) {
      console.warn(`Failed to get label events for MR ${mr.iid}:`, error);
      return { mrIid: mr.iid, events: [] as GitLabApiEvent[] };
    }
  });

  const labelEventsResults = await Promise.allSettled(labelEventsPromises);
  const eventsByMrIid = new Map<number, GitLabApiEvent[]>();

  for (const result of labelEventsResults) {
    if (result.status === 'fulfilled') {
      eventsByMrIid.set(result.value.mrIid, result.value.events);
    }
  }

  // Process all MRs in parallel with the fetched events
  return Promise.all(
    mergeRequests.map(async (mr) => {
      const actionRequiredLabels = mr.labels.filter(
        (label) =>
          label === LABELS.ACTION_REQUIRED ||
          label === LABELS.ACTION_REQUIRED2 ||
          label === LABELS.ACTION_REQUIRED3
      );

      // Get events only for MRs that need them
      const labelEvents = eventsByMrIid.get(mr.iid) || [];

      // Process label events in parallel within each MR
      const [actionRequiredLabelTime, statusUpdateCommitCount] = await Promise.all([
        // Calculate action required label time
        (async () => {
          if (actionRequiredLabels.length === 0) return undefined;

          const addEvents = labelEvents.filter(
            (event) =>
              event.action === 'add' &&
              event.label?.name &&
              actionRequiredLabels.includes(
                event.label.name as
                  | typeof LABELS.ACTION_REQUIRED
                  | typeof LABELS.ACTION_REQUIRED2
                  | typeof LABELS.ACTION_REQUIRED3
              )
          );

          if (addEvents.length === 0) return undefined;

          return Math.max(...addEvents.map((event) => new Date(event.created_at).getTime()));
        })(),
        // Calculate status update commit count
        (async () => {
          if (!mr.labels.includes(LABELS.STATUS_UPDATE_COMMIT)) return undefined;

          return labelEvents.filter(
            (event) => event.action === 'add' && event.label?.name === LABELS.STATUS_UPDATE_COMMIT
          ).length;
        })(),
      ]);

      return {
        mrIid: mr.iid,
        labels: mr.labels,
        url: mr.web_url,
        title: mr.title,
        actionRequiredLabelTime,
        statusUpdateCommitCount,
      };
    })
  );
};

export async function GET(request: Request) {
  try {
    // Environment variables validation
    const requiredEnvVars = ['GITLAB_BASE_URL'];
    const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

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

      const baseUrl = process.env.GITLAB_BASE_URL;
      if (!baseUrl) {
        return NextResponse.json({ error: 'GITLAB_BASE_URL is not configured' }, { status: 500 });
      }

      const gitlabClient = createGitLabClient({
        baseUrl,
        token,
        projectPath,
      });

      const issues = await gitlabClient.getProjectIssues(
        projectId,
        validatedData.usernames ?? undefined,
        validatedData.userIds ?? undefined
      );

      // Fetch merge requests for all issues in parallel
      const mergeRequestsPromises = issues.map((issue) =>
        gitlabClient.getIssueRelatedMergeRequests(projectId, issue.iid)
      );

      const mergeRequestsResults = await Promise.allSettled(mergeRequestsPromises);
      const mergeRequestsByIid = new Map<number, GitLabApiMergeRequest[]>();

      mergeRequestsResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && issues[index]) {
          const filteredMrs = result.value.filter(
            (mr) => mr.source_project_id === projectId && mr.state === 'opened'
          );
          mergeRequestsByIid.set(issues[index].iid, filteredMrs);
        } else {
          mergeRequestsByIid.set(issues[index].iid, []);
        }
      });

      // Collect all unique merge requests for batch processing
      const allMergeRequests = Array.from(mergeRequestsByIid.values()).flat();
      const uniqueMergeRequests = allMergeRequests.filter(
        (mr, index, self) => index === self.findIndex((other) => other.iid === mr.iid)
      );

      // Process merge request labels for all unique MRs
      const mergeRequestLabels = await processMergeRequestLabels(
        gitlabClient,
        projectId,
        uniqueMergeRequests
      );

      // Group processed labels by MR IID
      const labelsByMrIid = new Map<number, MergeRequestWithStats>();
      for (const label of mergeRequestLabels) {
        labelsByMrIid.set(label.mrIid, label);
      }

      // Process issues in batches with parallelized operations
      const issueStats = await processBatch(issues, async (issue) => {
        const issueMergeRequests = mergeRequestsByIid.get(issue.iid) || [];

        // Map merge request labels to this issue's MRs
        const issueMergeRequestLabels = issueMergeRequests
          .map((mr) => labelsByMrIid.get(mr.iid))
          .filter(Boolean) as MergeRequestWithStats[];

        // Calculate the latest action required time across all MRs for this issue
        const actionRequiredTime = issueMergeRequestLabels.reduce(
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
          milestone: issue.milestone,
          timeInProgress: issue.inProgressDuration,
          totalTimeFromStart: issue.totalTimeFromStart,
          mergeRequests: issueMergeRequestLabels,
          actionRequiredTime,
          url: issue.web_url,
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

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { decrypt } from '@/lib/crypto';
import { headers } from 'next/headers';

// Environment variables validation
const requiredEnvVars = ['GITLAB_PROJECT_ID', 'GITLAB_BASE_URL', 'GITLAB_PROJECT_PATH'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

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
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const headersList = await headers();
    const encryptedToken = headersList.get('x-gitlab-token-encrypted');

    if (!encryptedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const token = await decrypt(encryptedToken);

      const gitlabClient = createGitLabClient({
        baseUrl: process.env.GITLAB_BASE_URL!,
        token,
        projectPath: process.env.GITLAB_PROJECT_PATH!,
      });

      const { searchParams } = new URL(request.url);
      const validatedData = getStatisticsSchema.parse({
        usernames: searchParams.get('usernames'),
        userIds: searchParams.get('userIds'),
        projectId: process.env.GITLAB_PROJECT_ID,
      });

      const projectId = Number(validatedData.projectId);
      const issues = await gitlabClient.getProjectIssues(
        projectId,
        validatedData.usernames ?? undefined,
        validatedData.userIds ?? undefined
      );

      // Calculate statistics for each issue
      const issueStats = await Promise.all(
        issues.map(async issue => {
          const timeInProgress = issue.inProgressDuration;
          const totalTimeFromStart = issue.totalTimeFromStart;
          const mergeRequests = await gitlabClient.getIssueRelatedMergeRequests(
            projectId,
            issue.iid
          );

          // Check each MR for action-required labels
          const mergeRequestLabelsPromises = mergeRequests
            .filter(mr => mr.state === 'opened')
            .map(async mr => {
              const actionRequiredLabels = mr.labels.filter(label =>
                label.toLowerCase().includes('action-required')
              );

              let actionRequiredLabelTime: number | undefined = undefined;

              if (actionRequiredLabels.length > 0) {
                const labelEvents = await gitlabClient.getMergeRequestLabelEvents(
                  projectId,
                  mr.iid
                );

                let latestAddTime: number | undefined = undefined;

                for (const label of actionRequiredLabels) {
                  const addEvents = labelEvents.filter(
                    event => event.action === 'add' && event.label?.name === label
                  );

                  if (addEvents.length === 0) continue;

                  addEvents.sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  );

                  const addTime = new Date(addEvents[0].created_at).getTime();

                  if (!latestAddTime || addTime > latestAddTime) {
                    latestAddTime = addTime;
                  }
                }

                actionRequiredLabelTime = latestAddTime;
              }

              return {
                mrIid: mr.iid,
                labels: mr.labels,
                url: `${process.env.GITLAB_BASE_URL}/${process.env.GITLAB_PROJECT_PATH}/-/merge_requests/${mr.iid}`,
                title: mr.title,
                actionRequiredLabelTime,
              };
            });

          const mergeRequestLabels = await Promise.all(mergeRequestLabelsPromises);

          let actionRequiredTime: number | undefined = undefined;
          for (const mr of mergeRequestLabels) {
            if (
              mr.actionRequiredLabelTime &&
              (!actionRequiredTime || mr.actionRequiredLabelTime > actionRequiredTime)
            ) {
              actionRequiredTime = mr.actionRequiredLabelTime;
            }
          }

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
            url: `${process.env.GITLAB_BASE_URL}/${process.env.GITLAB_PROJECT_PATH}/-/issues/${issue.iid}`,
          };
        })
      );

      return NextResponse.json(issueStats);
    } catch (_error: unknown) {
      return NextResponse.json({ error: 'Invalid token or failed to fetch data' }, { status: 401 });
    }
  } catch (_error: unknown) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

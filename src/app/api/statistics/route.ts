import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient } from '@/src/tasks/gitlab-api.task';
import { decrypt } from '@/src/lib/crypto';
import { headers } from 'next/headers';
import { LABELS } from '@/src/constants/labels';

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

    // Try to get token from the header or cookie
    const headersList = await headers();

    // Get the token from cookies if the header is just a flag
    let encryptedToken = headersList.get('x-gitlab-token-encrypted');

    if (encryptedToken === 'true') {
      // If header is just the flag 'true', get the real token from cookies
      const cookiesList = await headers();
      const tokenCookie = cookiesList
        .get('cookie')
        ?.split(';')
        .find(c => c.trim().startsWith('gitlab-token='));

      if (tokenCookie) {
        encryptedToken = decodeURIComponent(tokenCookie.split('=')[1]);
      } else {
        encryptedToken = null;
      }
    }

    if (!encryptedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const token = await decrypt(encryptedToken);

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
              const actionRequiredLabels = mr.labels.filter(
                label =>
                  label === LABELS.ACTION_REQUIRED ||
                  label === LABELS.ACTION_REQUIRED2 ||
                  label === LABELS.ACTION_REQUIRED3
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
                url: `${process.env.GITLAB_BASE_URL}/${projectPath}/-/merge_requests/${mr.iid}`,
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
            url: `${process.env.GITLAB_BASE_URL}/${projectPath}/-/issues/${issue.iid}`,
          };
        })
      );

      return NextResponse.json(issueStats);
    } catch (error) {
      console.error('[API] Error decrypting token or fetching data:', error);
      return NextResponse.json({ error: 'Invalid token or failed to fetch data' }, { status: 401 });
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

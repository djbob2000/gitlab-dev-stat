import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createGitLabClient, IssueWithEvents } from '@/src/tasks/gitlab-api.task';
import { cookies } from 'next/headers';

// Environment variables validation
const requiredEnvVars = ['GITLAB_PROJECT_ID', 'GITLAB_BASE_URL', 'GITLAB_PROJECT_PATH'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
}

// Log environment variables (without sensitive data)
console.log('[Statistics API] Environment:', {
  GITLAB_BASE_URL: process.env.GITLAB_BASE_URL,
  GITLAB_PROJECT_PATH: process.env.GITLAB_PROJECT_PATH,
  GITLAB_PROJECT_ID: process.env.GITLAB_PROJECT_ID,
});

// Validation schema for GET request
const getStatisticsSchema = z.object({
  usernames: z.string().transform(str => str.split(',')).nullish(),
  userIds: z.string().transform(str => str.split(',').map(Number)).nullish(),
  projectId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('gitlab-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // GitLab client initialization with the token from cookies
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

    console.log('[Statistics API] Request params:', {
      usernames: validatedData.usernames,
      userIds: validatedData.userIds,
      projectId: validatedData.projectId,
    });

    const projectId = Number(validatedData.projectId);
    const issues = await gitlabClient.getProjectIssues(
      projectId,
      validatedData.usernames ?? undefined,
      validatedData.userIds ?? undefined
    );

    console.log(`[Statistics API] Found ${issues.length} issues`);

    // Group issues by assignee
    const issuesByAssignee = new Map<string, IssueWithEvents[]>();
    for (const issue of issues) {
      if (!issue.assignee?.username) continue;
      
      const assigneeIssues = issuesByAssignee.get(issue.assignee.username) || [];
      assigneeIssues.push(issue);
      issuesByAssignee.set(issue.assignee.username, assigneeIssues);
    }

    // Calculate statistics for each assignee
    const issueStats = await Promise.all(issues.map(async issue => {
      const timeInProgress = issue.inProgressDuration;
      const totalTimeFromStart = issue.totalTimeFromStart;
      const mergeRequests = await gitlabClient.getIssueRelatedMergeRequests(projectId, issue.iid);

      // Check each MR for action-required labels
      const mergeRequestLabelsPromises = mergeRequests
        .filter(mr => mr.state === 'opened')
        .map(async mr => {
          // Check if MR has any action-required label
          const actionRequiredLabels = mr.labels.filter(label => 
            label.toLowerCase().includes('action-required')
          );

          let actionRequiredLabelTime: number | undefined = undefined;
          
          if (actionRequiredLabels.length > 0) {
            // Get label events only for MRs with action-required labels
            const labelEvents = await gitlabClient.getMergeRequestLabelEvents(
              projectId,
              mr.iid
            );
            
            // For each current action-required label, find the time of its last addition
            let latestAddTime: number | undefined = undefined;
            
            for (const label of actionRequiredLabels) {
              // Find all events of adding this label
              const addEvents = labelEvents.filter(event => 
                event.action === 'add' && event.label?.name === label
              );
              
              if (addEvents.length === 0) continue;
              
              // Sort addition events by time (from newest to oldest)
              addEvents.sort((a, b) => 
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
              
              // Take the most recent addition event
              const addTime = new Date(addEvents[0].created_at).getTime();
              
              // If this is the latest label, update the time
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
            actionRequiredLabelTime
          };
        });
      
      const mergeRequestLabels = await Promise.all(mergeRequestLabelsPromises);

      // Find the latest time of adding an action-required label among all MRs
      let actionRequiredTime: number | undefined = undefined;
      for (const mr of mergeRequestLabels) {
        if (mr.actionRequiredLabelTime && (!actionRequiredTime || mr.actionRequiredLabelTime > actionRequiredTime)) {
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
      };
    }));

    console.log(`[Statistics API] Processed ${issueStats.length} issues with stats`);
    return NextResponse.json(issueStats);
  } catch (error) {
    console.error('[Statistics API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
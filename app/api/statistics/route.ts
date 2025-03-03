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
      
      // Get MR labels and check for action-required labels
      const mergeRequestLabelsPromises = mergeRequests
        .filter(mr => mr.state === 'opened')
        .filter(mr => mr.title.startsWith(`${issue.iid}`))
        .map(async mr => {
          // Check if MR has any action-required label
          const actionRequiredLabels = mr.labels.filter(label => 
            label === 'action-required' || 
            label === 'action-required2' || 
            label === 'action-required3'
          );
          
          // Если есть метка action-required, получаем время её добавления
          let actionRequiredLabelTime: number | undefined = undefined;
          
          if (actionRequiredLabels.length > 0) {
            // Получаем события меток только для MR с метками action-required
            const labelEvents = await gitlabClient.getMergeRequestLabelEvents(
              Number(validatedData.projectId),
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
      // We need the time of the last added label, not the earliest one
      let actionRequiredTime: number | undefined = undefined;
      
      mergeRequestLabels.forEach(mr => {
        if (mr.actionRequiredLabelTime) {
          if (!actionRequiredTime || mr.actionRequiredLabelTime > actionRequiredTime) {
            actionRequiredTime = mr.actionRequiredLabelTime;
          }
        }
      });

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
        actionRequiredTime,
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
export const LABELS = {
  ACTION_REQUIRED: 'action-required',
  ACTION_REQUIRED2: 'action-required2',
  ACTION_REQUIRED3: 'action-required3',
  BLOCKED: 'blocked',
  PAUSED: 'paused',
  REVIEW: 'review',
  IN_PROGRESS: 'in-progress',
  CODE_REVIEW: 'code-review',
  TEAM1: 'team1',
  TEAM2: 'team2',
  BUG: 'bug',
  APPROVED: 'approved',
  CLUSTER: 'cluster',
  COMMENT: 'comment',
  DISCUSS: 'discuss',
  FEEDBACK: 'feedback',
  MAINTENANCE: 'maintenance',
  NOT_READY: 'not-ready',
  QA_PRE_CHECK: 'qa-pre-check',
  STATUS_UPDATE_COMMIT: 'status-commit',
  TEST: 'test',
} as const;

export const PRIORITY_LABEL_PATTERN = /^p[1-9]$/;

export type LabelType = (typeof LABELS)[keyof typeof LABELS];

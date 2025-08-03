import { fetchWithToken } from '@/lib/api';
import { IssueStatistics } from '@/types';

/**
 * Fetches analytics data for specified developers and project
 */
export async function fetchAnalytics(
  developers: { userId: number; username: string }[],
  projectId: number,
  projectPath: string
): Promise<IssueStatistics[]> {
  if (developers.length === 0) {
    return [];
  }

  const params = new URLSearchParams();

  // Prefer user IDs over usernames for better reliability
  const userIds = developers.map(dev => dev.userId).filter(Boolean);

  if (userIds.length > 0) {
    params.append('userIds', userIds.join(','));
  } else {
    // Fall back to usernames if no user IDs are available
    const usernames = developers.map(dev => dev.username);
    params.append('usernames', usernames.join(','));
  }

  // Add project ID and path to the parameters
  params.append('projectId', projectId.toString());
  params.append('projectPath', projectPath);

  return fetchWithToken(`/api/statistics?${params.toString()}`);
}

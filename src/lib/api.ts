/**
 * Client-side API fetcher with token authentication
 * Uses same-origin credentials to send cookies with the request
 */
export async function fetchWithToken<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  // Get the encrypted token from a cookie
  // No need to get it manually, using credentials: 'same-origin' ensures cookies are sent

  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin', // This ensures cookies are sent with the request
    headers: {
      'Content-Type': 'application/json',
      // Add a custom header to inform the API routes that we're using an encrypted token
      'x-gitlab-token-encrypted': 'true',
      ...options.headers,
    },
  });

  if (!response.ok) {
    // Try to parse error response as JSON
    let errorData: Record<string, unknown>;
    try {
      errorData = await response.json();
    } catch (_e) {
      errorData = { error: 'Unknown error' };
    }

    // Create a detailed error message
    const message = (errorData.error as string) || 'API request failed';
    const detail = errorData.detail ? `: ${errorData.detail as string}` : '';

    throw new Error(`${message}${detail}`);
  }

  return response.json();
}

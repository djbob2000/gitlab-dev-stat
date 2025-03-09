export async function fetchWithToken(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'same-origin', // This ensures cookies are sent with the request
    headers: {
      ...options.headers,
    },
  });

  if (!response.ok) {
    console.error('[API Client] Request failed with status:', response.status);
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error('[API Client] Error response:', error);
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
}

export async function fetchWithToken(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-gitlab-token': document.cookie.split('; ').find(row => row.startsWith('gitlab-token='))?.split('=')[1] || '',
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'API request failed');
  }

  return response.json();
} 
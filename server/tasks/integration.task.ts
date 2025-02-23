import { toast } from 'sonner';
import { formatDuration } from './time-calculation.task';
import { z } from 'zod';

// Validation schemas
export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(data => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) <= new Date(data.endDate);
  }
  return true;
}, {
  message: "End date must be after start date",
});

// Error handling
export class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const handleAPIError = (error: unknown): never => {
  if (error instanceof APIError) {
    toast.error('API Error', {
      description: error.message
    });
  } else if (error instanceof Error) {
    toast.error('Application Error', {
      description: error.message
    });
  } else {
    toast.error('Unknown Error', {
      description: 'An unexpected error occurred'
    });
  }
  throw error;
};

// Date/Time formatting
export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof date === 'string' ? new Date(date) : date);
};

export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat('default', { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  }
};

// API response types
export interface APIResponse<T> {
  data: T;
  error?: string;
  status: number;
}

// API request helpers
export async function fetchAPI<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new APIError(
      data.error || 'API request failed',
      response.status,
      data.code
    );
  }

  return data;
}

// UI State helpers
export interface LoadingState {
  isLoading: boolean;
  error: Error | null;
}

export function getLoadingState(
  isLoading: boolean,
  error: unknown = null
): LoadingState {
  return {
    isLoading,
    error: error instanceof Error ? error : null,
  };
}

// Time formatting helpers
export const timeFormatters = {
  duration: formatDuration,
  date: formatDate,
  relative: formatRelativeTime,
};

// Export all formatters and helpers
export const integration = {
  formatters: timeFormatters,
  handleError: handleAPIError,
  fetchAPI,
}; 
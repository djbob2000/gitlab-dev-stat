import { NextResponse } from 'next/server';
import { ApiErrorResponse } from '@/src/types';

export type ApiErrorType = {
  message: string;
  status: number;
  details?: unknown;
  name: string;
};

export function createApiError(message: string, status: number, details?: unknown): ApiErrorType {
  return {
    name: 'ApiError',
    message,
    status,
    details,
  };
}

export function createErrorResponse(
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        details,
      },
    } as ApiErrorResponse,
    { status }
  );
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  console.error('API Error:', error);

  if (isApiError(error)) {
    return createErrorResponse(error.message, error.status, error.details);
  }

  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  return createErrorResponse(errorMessage, 500);
}

function isApiError(error: unknown): error is ApiErrorType {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as ApiErrorType).name === 'ApiError' &&
    'message' in error &&
    'status' in error &&
    typeof (error as ApiErrorType).message === 'string' &&
    typeof (error as ApiErrorType).status === 'number'
  );
}

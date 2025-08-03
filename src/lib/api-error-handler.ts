import { NextResponse } from 'next/server';
import { ApiErrorResponse, ApiErrorCode } from '@/types';

/**
 * Creates a standardized error response
 * Used in middleware and API routes to return consistent error format
 */
export function createErrorResponse(
  message: string,
  status: number,
  code: ApiErrorCode,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        details,
        timestamp: new Date().toISOString(),
      },
    } as ApiErrorResponse,
    { status }
  );
}

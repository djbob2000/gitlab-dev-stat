import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling API requests
 * Extracts GitLab token from cookies and adds it to request headers
 */
export function middleware(request: NextRequest) {
  // Get token from cookie
  const token = request.cookies.get('gitlab-token');

  console.log('Middleware called for path:', request.nextUrl.pathname);
  console.log('Token present:', !!token);

  if (!token || !token.value) {
    console.log('No token found, returning 401');
    return NextResponse.json(
      {
        error: 'GitLab token is required',
        detail: 'Please add your token in settings.',
        path: request.nextUrl.pathname,
      },
      { status: 401 }
    );
  }

  // Clone request headers and add token
  const headers = new Headers(request.headers);
  headers.set('x-gitlab-token-encrypted', token.value);
  console.log('Added encrypted token to headers');

  // Return request with added header
  return NextResponse.next({
    request: {
      headers,
    },
  });
}

/**
 * Middleware configuration - specifies paths for which it should execute
 * Only applied to API routes
 *  It's a special Next.js convention that the framework automatically recognizes.
 */
export const config = {
  matcher: ['/api/:path*'],
};

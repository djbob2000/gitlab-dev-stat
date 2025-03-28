import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware for handling API requests
 * Extracts GitLab token from cookies and adds it to request headers
 */
export function middleware(request: NextRequest) {
  // Clone the request headers
  const requestHeaders = new Headers(request.headers);

  // Get the token from client cookies
  const tokenFromCookie = request.cookies.get('gitlab-token')?.value;

  console.log('Middleware called for path:', request.nextUrl.pathname);
  console.log('Token present:', !!tokenFromCookie);

  // Add token to the headers if it exists
  if (tokenFromCookie) {
    requestHeaders.set('X-GitLab-Token', tokenFromCookie);
    // Also set a flag for routes that need the encrypted token
    requestHeaders.set('X-GitLab-Token-Encrypted', 'true');
    console.log('Added encrypted token to headers');
  }

  // Return the response with modified headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
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
